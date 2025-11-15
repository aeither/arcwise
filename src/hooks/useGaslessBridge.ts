/**
 * Gasless Bridge Hook using ONLY Circle Smart Account
 * No MetaMask or wagmi required - purely Circle Smart Account + Bridge Kit
 */

import { useState, useCallback } from 'react'
import { createBundlerClient, type Hex } from 'viem/account-abstraction'
import { baseSepolia } from 'viem/chains'
import { toModularTransport } from '@circle-fin/modular-wallets-core'
import { BridgeKit } from '@circle-fin/bridge-kit'
import type { BridgeParams } from '@circle-fin/bridge-kit'
import { useCircleSmartAccount } from './useCircleSmartAccount'
import { createPublicClient, parseUnits, formatUnits, erc20Abi } from 'viem'

const clientKey = import.meta.env.VITE_CLIENT_KEY as string
const clientUrl = import.meta.env.VITE_CLIENT_URL as string

// Chain IDs
export const SEPOLIA_CHAIN_ID = 11155111
export const BASE_SEPOLIA_CHAIN_ID = 84532
export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614
export const ARC_CHAIN_ID = 5042002

export const CHAIN_NAMES: Record<number, string> = {
  [SEPOLIA_CHAIN_ID]: 'Ethereum Sepolia',
  [BASE_SEPOLIA_CHAIN_ID]: 'Base Sepolia',
  [ARBITRUM_SEPOLIA_CHAIN_ID]: 'Arbitrum Sepolia',
  [ARC_CHAIN_ID]: 'Arc Testnet',
}

// USDC addresses
const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  [SEPOLIA_CHAIN_ID]: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  [BASE_SEPOLIA_CHAIN_ID]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  [ARBITRUM_SEPOLIA_CHAIN_ID]: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  [ARC_CHAIN_ID]: '0x3600000000000000000000000000000000000000',
}

export type BridgeStep =
  | 'idle'
  | 'approving'
  | 'bridging'
  | 'waiting'
  | 'success'
  | 'error'

export interface GaslessBridgeState {
  step: BridgeStep
  error: string | null
  isLoading: boolean
  sourceTxHash?: Hex
  receiveTxHash?: Hex
  sourceChainId?: number
  destinationChainId?: number
}

export function useGaslessBridge() {
  const { account } = useCircleSmartAccount()

  const [state, setState] = useState<GaslessBridgeState>({
    step: 'idle',
    error: null,
    isLoading: false,
  })

  const [tokenBalance, setTokenBalance] = useState('0')
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [balanceError, setBalanceError] = useState('')

  /**
   * Fetch USDC balance for the smart account on a specific chain
   */
  const fetchBalance = useCallback(
    async (chainId: number) => {
      if (!account) {
        setTokenBalance('0')
        return
      }

      setIsLoadingBalance(true)
      setBalanceError('')

      try {
        const usdcAddress = USDC_ADDRESSES[chainId]
        if (!usdcAddress) {
          throw new Error(`USDC not supported on chain ${chainId}`)
        }

        // Create transport for the specific chain
        let chainPath = ''
        switch (chainId) {
          case SEPOLIA_CHAIN_ID:
            chainPath = 'sepolia'
            break
          case BASE_SEPOLIA_CHAIN_ID:
            chainPath = 'baseSepolia'
            break
          case ARBITRUM_SEPOLIA_CHAIN_ID:
            chainPath = 'arbitrumSepolia'
            break
          case ARC_CHAIN_ID:
            chainPath = 'arc'
            break
          default:
            throw new Error(`Unsupported chain ${chainId}`)
        }

        const transport = toModularTransport(`${clientUrl}/${chainPath}`, clientKey)
        const publicClient = createPublicClient({
          transport,
        })

        const balance = await publicClient.readContract({
          address: usdcAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [account.address],
        })

        const formattedBalance = formatUnits(balance as bigint, 6)
        setTokenBalance(formattedBalance)
        console.log(`✅ Balance on ${CHAIN_NAMES[chainId]}: ${formattedBalance} USDC`)
      } catch (err: any) {
        console.error('Balance fetch error:', err)
        setBalanceError(err.message || 'Failed to fetch balance')
        setTokenBalance('0')
      } finally {
        setIsLoadingBalance(false)
      }
    },
    [account]
  )

  /**
   * Bridge USDC using Circle Smart Account (GASLESS!)
   * This uses the bundler client to send gasless transactions
   */
  const bridge = useCallback(
    async (
      amount: string,
      sourceChainId: number,
      destinationChainId: number,
      recipientAddress?: string
    ) => {
      if (!account) {
        setState({
          step: 'error',
          error: 'No smart account connected. Please login first.',
          isLoading: false,
        })
        return
      }

      if (!amount || parseFloat(amount) <= 0) {
        setState({
          step: 'error',
          error: 'Invalid amount',
          isLoading: false,
        })
        return
      }

      try {
        setState({
          step: 'idle',
          error: null,
          isLoading: true,
          sourceChainId,
          destinationChainId,
        })

        console.log(`🌉 Starting gasless bridge: ${amount} USDC from ${CHAIN_NAMES[sourceChainId]} to ${CHAIN_NAMES[destinationChainId]}`)
        console.log(`📍 Smart Account: ${account.address}`)
        console.log(`📍 Recipient: ${recipientAddress || account.address}`)

        // Get USDC addresses
        const sourceUSDC = USDC_ADDRESSES[sourceChainId]
        const destinationUSDC = USDC_ADDRESSES[destinationChainId]

        if (!sourceUSDC || !destinationUSDC) {
          throw new Error('USDC not supported on selected chains')
        }

        // Create transport for source chain
        let sourceChainPath = ''
        switch (sourceChainId) {
          case SEPOLIA_CHAIN_ID:
            sourceChainPath = 'sepolia'
            break
          case BASE_SEPOLIA_CHAIN_ID:
            sourceChainPath = 'baseSepolia'
            break
          case ARBITRUM_SEPOLIA_CHAIN_ID:
            sourceChainPath = 'arbitrumSepolia'
            break
          case ARC_CHAIN_ID:
            sourceChainPath = 'arc'
            break
          default:
            throw new Error(`Unsupported source chain ${sourceChainId}`)
        }

        const sourceTransport = toModularTransport(`${clientUrl}/${sourceChainPath}`, clientKey)

        // Create bundler client for the source chain with smart account
        const bundlerClient = createBundlerClient({
          account,
          transport: sourceTransport,
          paymaster: true, // Enable gasless transactions!
        })

        console.log('✅ Bundler client created with smart account')

        // Step 1: Approve USDC for Bridge Kit (if needed)
        setState(prev => ({ ...prev, step: 'approving' }))
        console.log('🔄 Step 1: Approving USDC...')

        // Note: Bridge Kit handles approvals internally, so we might not need this step
        // We'll let Bridge Kit manage the approval flow

        // Step 2: Execute bridge using Bridge Kit
        setState(prev => ({ ...prev, step: 'bridging' }))
        console.log('🔄 Step 2: Executing bridge...')

        // Initialize Bridge Kit
        const bridgeKit = new BridgeKit()

        // Get supported chains
        const supportedChains = bridgeKit.getSupportedChains()

        // Find source and destination chains
        const sourceChain = supportedChains.find((c: any) => c.chainId === sourceChainId)
        const destChain = supportedChains.find((c: any) => c.chainId === destinationChainId)

        if (!sourceChain || !destChain) {
          throw new Error('Chain not supported by Bridge Kit')
        }

        // Bridge parameters - use bundlerClient as adapter
        const bridgeParams: BridgeParams = {
          from: {
            adapter: bundlerClient as any, // Use bundler client as adapter
            chain: sourceChain.chain,
          },
          to: {
            adapter: bundlerClient as any,
            chain: destChain.chain,
            recipientAddress: recipientAddress || account.address, // Default to smart account address
          },
          amount: amount,
        }

        console.log('📦 Bridge parameters:', bridgeParams)

        // Execute bridge
        const result = await bridgeKit.bridge(bridgeParams)

        console.log('✅ Bridge initiated:', result)

        // Step 3: Wait for completion
        setState(prev => ({ ...prev, step: 'waiting' }))
        console.log('🔄 Step 3: Waiting for bridge completion...')

        // Extract transaction hashes from result
        let sourceTxHash: Hex | undefined
        let receiveTxHash: Hex | undefined

        if (result?.steps) {
          if (result.steps[1]?.txHash) {
            sourceTxHash = result.steps[1].txHash as Hex
          }
          if (result.steps[3]?.txHash) {
            receiveTxHash = result.steps[3].txHash as Hex
          }
        }

        // Success!
        setState({
          step: 'success',
          error: null,
          isLoading: false,
          sourceTxHash,
          receiveTxHash,
          sourceChainId,
          destinationChainId,
        })

        console.log('🎉 Gasless bridge completed successfully!')

        // Refresh balances
        setTimeout(() => {
          fetchBalance(sourceChainId)
          fetchBalance(destinationChainId)
        }, 2000)

      } catch (err: any) {
        console.error('❌ Gasless bridge error:', err)

        let errorMessage = err.message || 'Bridge failed'

        // Parse specific errors
        if (errorMessage.includes('User rejected') || errorMessage.includes('user rejected')) {
          errorMessage = 'You rejected the transaction'
        } else if (errorMessage.includes('Insufficient')) {
          errorMessage = 'Insufficient balance'
        } else if (errorMessage.includes('not supported')) {
          errorMessage = 'Bridge route not supported'
        }

        setState({
          step: 'error',
          error: `Bridge failed: ${errorMessage}`,
          isLoading: false,
        })
      }
    },
    [account, fetchBalance]
  )

  const reset = useCallback(() => {
    setState({
      step: 'idle',
      error: null,
      isLoading: false,
      sourceTxHash: undefined,
      receiveTxHash: undefined,
    })
  }, [])

  return {
    state,
    tokenBalance,
    isLoadingBalance,
    balanceError,
    fetchBalance,
    bridge,
    reset,
  }
}
