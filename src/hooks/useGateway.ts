/**
 * Hook for managing Circle Gateway interactions
 */

import { useState, useCallback, useEffect } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { parseUnits, formatUnits, erc20Abi, getContract, type Hash, createPublicClient, http, encodeFunctionData } from 'viem'
import { createBundlerClient, type SmartAccount } from 'viem/account-abstraction'
import { toModularTransport } from '@circle-fin/modular-wallets-core'
import {
  GatewayClient,
  type ChainBalance,
  type BurnIntent,
} from '@/lib/gateway-client'
import {
  SUPPORTED_CHAINS,
  USDC_DECIMALS,
  getChainConfigByDomain,
  createChainClient,
  type GatewayChainConfig,
} from '@/lib/gateway-constants'
import { gatewayWalletAbi, gatewayMinterAbi } from '@/lib/gateway-abis'

const clientKey = import.meta.env.VITE_CLIENT_KEY as string
const clientUrl = import.meta.env.VITE_CLIENT_URL as string

// Helper to get Circle chain path from chain ID
function getChainPath(chainId: number): string {
  switch (chainId) {
    case 11155111: // Sepolia
      return 'sepolia'
    case 84532: // Base Sepolia
      return 'baseSepolia'
    case 421614: // Arbitrum Sepolia
      return 'arbitrumSepolia'
    case 5042002: // Arc Testnet
      return 'arc'
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`)
  }
}

export interface ChainBalanceWithWallet extends ChainBalance {
  walletBalance?: string
}

export interface GatewayState {
  balances: ChainBalanceWithWallet[]
  totalBalance: string
  isLoading: boolean
  error: string | null
  txHash: Hash | null
}

export function useGateway(userAddress?: `0x${string}`, smartAccount?: SmartAccount) {
  const { address: wagmiAddress, chain: currentChain } = useAccount()
  const address = userAddress || wagmiAddress
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [state, setState] = useState<GatewayState>({
    balances: [],
    totalBalance: '0',
    isLoading: false,
    error: null,
    txHash: null,
  })

  const gatewayClient = new GatewayClient()

  /**
   * Fetch balances across all supported chains
   */
  const fetchBalances = useCallback(async () => {
    if (!address || !publicClient) {
      setState(prev => ({ ...prev, balances: [], totalBalance: '0' }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Only fetch Gateway API balances for chains that support it
      const chainsWithGateway = SUPPORTED_CHAINS.filter(c => c.supportsGateway)
      const gatewayDomains = chainsWithGateway.map(c => c.domain)

      let gatewayBalances: ChainBalance[] = []

      // Only call Gateway API if there are chains that support it
      if (gatewayDomains.length > 0) {
        try {
          const response = await gatewayClient.balances('USDC', address, gatewayDomains)
          gatewayBalances = response.balances
        } catch (err) {
          console.error('Error fetching Gateway balances:', err)
          // Continue without Gateway balances - just show wallet balances
        }
      }

      // Fetch wallet balances for all supported chains
      const balancesWithWallet: ChainBalanceWithWallet[] = await Promise.all(
        SUPPORTED_CHAINS.map(async (chainConfig) => {
          const gatewayBalance = gatewayBalances.find(b => b.domain === chainConfig.domain)

          // Fetch wallet balance from the chain
          let walletBalance = '0'
          try {
            const chainClient = createPublicClient({
              chain: chainConfig.chain,
              transport: http(),
            })

            const balance = await chainClient.readContract({
              address: chainConfig.usdcAddress,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [address],
            })

            walletBalance = formatUnits(balance as bigint, USDC_DECIMALS)
          } catch (err) {
            console.error(`Error fetching wallet balance for ${chainConfig.name}:`, err)
          }

          return {
            domain: chainConfig.domain,
            balance: gatewayBalance?.balance || '0',
            walletBalance,
          }
        })
      )

      // Calculate total Gateway balance (only for chains that support Gateway)
      const total = balancesWithWallet.reduce((sum, current) => {
        return sum + parseFloat(current.balance)
      }, 0)

      setState(prev => ({
        ...prev,
        balances: balancesWithWallet,
        totalBalance: total.toFixed(6),
        isLoading: false,
      }))
    } catch (err) {
      console.error('Error fetching balances:', err)
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to fetch balances',
        isLoading: false,
      }))
    }
  }, [address, publicClient])

  /**
   * Deposit USDC to Gateway Wallet on a specific chain (using Circle Smart Account)
   */
  const deposit = useCallback(
    async (chainConfig: GatewayChainConfig, amount: string) => {
      if (!address) {
        throw new Error('Wallet not connected')
      }

      // Use smart account if available, otherwise fall back to wagmi
      if (!smartAccount && !walletClient) {
        throw new Error('No wallet available')
      }

      setState(prev => ({ ...prev, isLoading: true, error: null, txHash: null }))

      try {
        const amountBigInt = parseUnits(amount, USDC_DECIMALS)

        if (smartAccount) {
          // Use Circle Smart Account with gasless transactions
          const chainPath = getChainPath(chainConfig.chain.id)
          const transport = toModularTransport(`${clientUrl}/${chainPath}`, clientKey)

          const bundlerClient = createBundlerClient({
            account: smartAccount,
            chain: chainConfig.chain,
            transport,
            paymaster: true,
          })

          // Encode approve call
          const approveData = encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [chainConfig.gatewayWalletAddress, amountBigInt],
          })

          // Encode deposit call
          const depositData = encodeFunctionData({
            abi: gatewayWalletAbi,
            functionName: 'deposit',
            args: [chainConfig.usdcAddress, amountBigInt],
          })

          // Send both operations in a single user operation (gasless!)
          const userOpHash = await bundlerClient.sendUserOperation({
            calls: [
              {
                to: chainConfig.usdcAddress,
                data: approveData,
              },
              {
                to: chainConfig.gatewayWalletAddress,
                data: depositData,
              },
            ],
            paymaster: true,
          } as any)

          // Wait for the user operation to be mined
          const { receipt } = await bundlerClient.waitForUserOperationReceipt({
            hash: userOpHash,
          })

          setState(prev => ({
            ...prev,
            isLoading: false,
            txHash: receipt.transactionHash,
          }))

          // Refresh balances after deposit
          setTimeout(() => fetchBalances(), 5000)

          return receipt.transactionHash
        } else {
          // Fallback to wagmi wallet client
          const approveTx = await walletClient!.writeContract({
            address: chainConfig.usdcAddress,
            abi: erc20Abi,
            functionName: 'approve',
            args: [chainConfig.gatewayWalletAddress, amountBigInt],
            chain: chainConfig.chain,
          })

          if (publicClient) {
            await publicClient.waitForTransactionReceipt({ hash: approveTx })
          }

          const depositTx = await walletClient!.writeContract({
            address: chainConfig.gatewayWalletAddress,
            abi: gatewayWalletAbi,
            functionName: 'deposit',
            args: [chainConfig.usdcAddress, amountBigInt],
            chain: chainConfig.chain,
          })

          if (publicClient) {
            await publicClient.waitForTransactionReceipt({ hash: depositTx })
          }

          setState(prev => ({
            ...prev,
            isLoading: false,
            txHash: depositTx,
          }))

          setTimeout(() => fetchBalances(), 5000)
          return depositTx
        }
      } catch (err) {
        console.error('Deposit error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to deposit'
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }))
        throw err
      }
    },
    [address, smartAccount, walletClient, publicClient, fetchBalances]
  )

  /**
   * Transfer USDC across chains using Gateway
   */
  const transfer = useCallback(
    async (
      destinationChainConfig: GatewayChainConfig,
      amount: string,
      recipient: string
    ) => {
      if (!address || !walletClient) {
        throw new Error('Wallet not connected')
      }

      setState(prev => ({ ...prev, isLoading: true, error: null, txHash: null }))

      try {
        const amountToTransfer = parseFloat(amount)

        // Create burn intents from available balances
        let amountToCover = amountToTransfer
        const burnIntents: any[] = []

        for (const balance of state.balances) {
          if (amountToCover <= 0) break

          const availableAmount = parseFloat(balance.balance)
          if (availableAmount > 0) {
            const amountToBurn = Math.min(amountToCover, availableAmount)
            const sourceChain = getChainConfigByDomain(balance.domain)

            if (sourceChain) {
              const nonce = Date.now()

              // Create burn intent message
              const burnIntent = {
                from: sourceChain.domain,
                to: destinationChainConfig.domain,
                amount: (amountToBurn * 1e6).toFixed(0), // Convert to USDC base units
                recipient: recipient,
                nonce: nonce.toString(),
              }

              // Define EIP-712 domain and types for burn intent
              const domain = {
                name: 'CircleGateway',
                version: '1',
                chainId: sourceChain.chain.id,
                verifyingContract: sourceChain.gatewayWalletAddress,
              }

              const types = {
                BurnIntent: [
                  { name: 'from', type: 'uint32' },
                  { name: 'to', type: 'uint32' },
                  { name: 'amount', type: 'uint256' },
                  { name: 'recipient', type: 'address' },
                  { name: 'nonce', type: 'uint256' },
                ],
              }

              try {
                // Sign the burn intent using EIP-712
                const signature = await walletClient.signTypedData({
                  account: address,
                  domain,
                  types,
                  primaryType: 'BurnIntent',
                  message: burnIntent,
                })

                burnIntents.push({
                  burnIntent,
                  signature,
                })

                amountToCover -= amountToBurn
              } catch (signError) {
                console.error('Failed to sign burn intent:', signError)
                throw new Error('User rejected signature or signing failed')
              }
            }
          }
        }

        if (amountToCover > 0) {
          throw new Error('Insufficient balance across all chains')
        }

        if (burnIntents.length === 0) {
          throw new Error('No valid burn intents created')
        }

        // Request attestation from Gateway API
        const response = await gatewayClient.transfer(burnIntents)

        if (!response.success || !response.attestation || !response.signature) {
          throw new Error(response.message || 'Failed to get attestation from Gateway API')
        }

        // Mint on destination chain
        const mintTx = await walletClient.writeContract({
          address: destinationChainConfig.gatewayWalletAddress,
          abi: gatewayMinterAbi,
          functionName: 'gatewayMint',
          args: [response.attestation as `0x${string}`, response.signature as `0x${string}`],
          chain: destinationChainConfig.chain,
        })

        // Wait for mint confirmation
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: mintTx })
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          txHash: mintTx,
        }))

        // Refresh balances
        setTimeout(() => fetchBalances(), 5000)

        return mintTx
      } catch (err) {
        console.error('Transfer error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to transfer'
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }))
        throw err
      }
    },
    [address, walletClient, publicClient, state.balances, fetchBalances]
  )

  /**
   * Clear transaction state
   */
  const clearTransaction = useCallback(() => {
    setState(prev => ({
      ...prev,
      txHash: null,
      error: null,
    }))
  }, [])

  /**
   * Fetch balances on mount and when address changes
   */
  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  return {
    ...state,
    deposit,
    transfer,
    fetchBalances,
    clearTransaction,
  }
}
