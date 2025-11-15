/**
 * Hook for managing Circle Gateway interactions
 */

import { useState, useCallback, useEffect } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { parseUnits, formatUnits, erc20Abi, getContract, type Hash } from 'viem'
import {
  GatewayClient,
  type ChainBalance,
  type BurnIntent,
} from '@/lib/gateway-client'
import {
  SUPPORTED_CHAINS,
  USDC_DECIMALS,
  getChainConfigByDomain,
  type GatewayChainConfig,
} from '@/lib/gateway-constants'
import { gatewayWalletAbi, gatewayMinterAbi } from '@/lib/gateway-abis'

export interface GatewayState {
  balances: ChainBalance[]
  totalBalance: string
  isLoading: boolean
  error: string | null
  txHash: Hash | null
}

export function useGateway() {
  const { address, chain: currentChain } = useAccount()
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
    if (!address) {
      setState(prev => ({ ...prev, balances: [], totalBalance: '0' }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const { balances } = await gatewayClient.balances('USDC', address)

      // Calculate total balance
      const total = balances.reduce((sum, current) => {
        return sum + parseFloat(current.balance)
      }, 0)

      setState(prev => ({
        ...prev,
        balances,
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
  }, [address])

  /**
   * Deposit USDC to Gateway Wallet on a specific chain
   */
  const deposit = useCallback(
    async (chainConfig: GatewayChainConfig, amount: string) => {
      if (!address || !walletClient) {
        throw new Error('Wallet not connected')
      }

      setState(prev => ({ ...prev, isLoading: true, error: null, txHash: null }))

      try {
        const amountBigInt = parseUnits(amount, USDC_DECIMALS)

        // First approve the Gateway Wallet to spend USDC
        const approveTx = await walletClient.writeContract({
          address: chainConfig.usdcAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [chainConfig.gatewayWalletAddress, amountBigInt],
          chain: chainConfig.chain,
        })

        // Wait for approval confirmation
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: approveTx })
        }

        // Then deposit to Gateway Wallet
        const depositTx = await walletClient.writeContract({
          address: chainConfig.gatewayWalletAddress,
          abi: gatewayWalletAbi,
          functionName: 'deposit',
          args: [chainConfig.usdcAddress, amountBigInt],
          chain: chainConfig.chain,
        })

        // Wait for deposit confirmation
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: depositTx })
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          txHash: depositTx,
        }))

        // Refresh balances after deposit
        // Note: Balance will only be available after chain finality
        setTimeout(() => fetchBalances(), 5000)

        return depositTx
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
    [address, walletClient, publicClient, fetchBalances]
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
              // Create a burn intent (simplified version)
              // In production, you'd need to sign this properly with EIP-712
              const intent = {
                burnIntent: {
                  from: sourceChain.domain,
                  to: destinationChainConfig.domain,
                  amount: amountToBurn.toString(),
                  recipient: recipient,
                  nonce: Date.now().toString(),
                },
                signature: '0x' as `0x${string}`,
              }

              burnIntents.push(intent)
              amountToCover -= amountToBurn
            }
          }
        }

        if (amountToCover > 0) {
          throw new Error('Insufficient balance across all chains')
        }

        // Request attestation from Gateway API
        const response = await gatewayClient.transfer(burnIntents)

        if (!response.success || !response.attestation || !response.signature) {
          throw new Error(response.message || 'Failed to get attestation')
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
