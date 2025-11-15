/**
 * Hook for writing to smart contracts using Circle Smart Account
 * Based on Circle's Modular Wallets SDK documentation
 * Uses ERC-4337 Account Abstraction with gasless transactions
 */

import { useState } from 'react'
import { createBundlerClient } from 'viem/account-abstraction'
import { baseSepolia } from 'viem/chains'
import { toModularTransport, encodeTransfer } from '@circle-fin/modular-wallets-core'
import { useCircleSmartAccount } from './useCircleSmartAccount'
import { type Address, type Abi, encodeFunctionData, parseUnits, Hex } from 'viem'

const clientKey = import.meta.env.VITE_CLIENT_KEY as string
const clientUrl = import.meta.env.VITE_CLIENT_URL as string

// Create transport and bundler client for writing
const modularTransport = toModularTransport(`${clientUrl}/baseSepolia`, clientKey)

export interface UseSmartAccountContractWriteConfig<TAbi extends Abi = Abi> {
  address: Address
  abi: TAbi
  functionName: string
  enabled?: boolean
}

export interface WriteContractArgs {
  args?: readonly unknown[]
  value?: bigint
}

export interface UseSmartAccountContractWriteResult {
  write: (writeArgs?: WriteContractArgs) => Promise<Hex>
  writeAsync: (writeArgs?: WriteContractArgs) => Promise<{
    hash: Hex
    receipt: any
  }>
  isLoading: boolean
  isSuccess: boolean
  error: Error | null
  userOpHash: Hex | null
  txHash: Hex | null
  reset: () => void
}

/**
 * Write to a smart contract using Circle Smart Account with gasless transactions
 *
 * @example
 * const { write, isLoading, isSuccess } = useSmartAccountContractWrite({
 *   address: '0x...',
 *   abi: contractAbi,
 *   functionName: 'transfer',
 * })
 *
 * // Execute the transaction
 * await write({ args: [recipientAddress, amount] })
 */
export function useSmartAccountContractWrite<TAbi extends Abi>(
  config: UseSmartAccountContractWriteConfig<TAbi>
): UseSmartAccountContractWriteResult {
  const { account } = useCircleSmartAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [userOpHash, setUserOpHash] = useState<Hex | null>(null)
  const [txHash, setTxHash] = useState<Hex | null>(null)

  const { address, abi, functionName, enabled = true } = config

  const write = async (writeArgs?: WriteContractArgs): Promise<Hex> => {
    if (!enabled) {
      throw new Error('Contract write is disabled')
    }

    if (!account) {
      throw new Error('No smart account connected. Please login first.')
    }

    try {
      setIsLoading(true)
      setError(null)
      setIsSuccess(false)
      setUserOpHash(null)
      setTxHash(null)

      // Create bundler client with the smart account
      const bundlerClient = createBundlerClient({
        account,
        chain: baseSepolia,
        transport: modularTransport,
        paymaster: true, // Enable gasless transactions
      })

      // Encode the function call
      const data = encodeFunctionData({
        abi,
        functionName,
        args: writeArgs?.args || [],
      })

      // Send user operation
      const hash = await bundlerClient.sendUserOperation({
        calls: [
          {
            to: address,
            data,
            value: writeArgs?.value || 0n,
          },
        ],
        paymaster: true,
      } as any)

      setUserOpHash(hash)

      // Wait for transaction receipt
      const { receipt } = await bundlerClient.waitForUserOperationReceipt({
        hash,
      })

      setTxHash(receipt.transactionHash)
      setIsSuccess(true)

      return receipt.transactionHash
    } catch (err) {
      console.error('Contract write error:', err)
      const error = err instanceof Error ? err : new Error('Failed to write to contract')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const writeAsync = async (writeArgs?: WriteContractArgs) => {
    const hash = await write(writeArgs)

    // Create bundler client to get receipt
    const bundlerClient = createBundlerClient({
      account: account!,
      chain: baseSepolia,
      transport: modularTransport,
      paymaster: true,
    })

    const { receipt } = await bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash!,
    })

    return {
      hash,
      receipt,
    }
  }

  const reset = () => {
    setIsLoading(false)
    setIsSuccess(false)
    setError(null)
    setUserOpHash(null)
    setTxHash(null)
  }

  return {
    write,
    writeAsync,
    isLoading,
    isSuccess,
    error,
    userOpHash,
    txHash,
    reset,
  }
}

/**
 * Send USDC using Circle's optimized encodeTransfer helper
 *
 * @example
 * const { sendUSDC, isLoading } = useSmartAccountSendUSDC()
 * await sendUSDC({
 *   to: '0x...',
 *   amount: '1.5', // in USDC (will be converted to base units)
 * })
 */
export function useSmartAccountSendUSDC() {
  const { account } = useCircleSmartAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [userOpHash, setUserOpHash] = useState<Hex | null>(null)
  const [txHash, setTxHash] = useState<Hex | null>(null)

  const sendUSDC = async (config: {
    to: Address
    amount: string
    usdcAddress: Address
  }): Promise<Hex> => {
    if (!account) {
      throw new Error('No smart account connected. Please login first.')
    }

    try {
      setIsLoading(true)
      setError(null)
      setIsSuccess(false)
      setUserOpHash(null)
      setTxHash(null)

      // Create bundler client
      const bundlerClient = createBundlerClient({
        account,
        chain: baseSepolia,
        transport: modularTransport,
        paymaster: true,
      })

      // Use Circle's optimized encodeTransfer
      const callData = encodeTransfer(
        config.to,
        config.usdcAddress,
        parseUnits(config.amount, 6) // USDC has 6 decimals
      )

      // Send user operation with paymaster sponsorship
      const hash = await bundlerClient.sendUserOperation({
        calls: [callData],
        paymaster: true,
      } as any)

      setUserOpHash(hash)

      // Wait for transaction receipt
      const { receipt } = await bundlerClient.waitForUserOperationReceipt({
        hash,
      })

      setTxHash(receipt.transactionHash)
      setIsSuccess(true)

      return receipt.transactionHash
    } catch (err) {
      console.error('Send USDC error:', err)
      const error = err instanceof Error ? err : new Error('Failed to send USDC')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const reset = () => {
    setIsLoading(false)
    setIsSuccess(false)
    setError(null)
    setUserOpHash(null)
    setTxHash(null)
  }

  return {
    sendUSDC,
    isLoading,
    isSuccess,
    error,
    userOpHash,
    txHash,
    reset,
  }
}

/**
 * Estimate gas for a user operation
 */
export async function estimateUserOperationGas(config: {
  account: any
  calls: any[]
}) {
  const bundlerClient = createBundlerClient({
    account: config.account,
    chain: baseSepolia,
    transport: modularTransport,
    paymaster: true,
  })

  return bundlerClient.estimateUserOperationGas({
    calls: config.calls,
    account: config.account,
  })
}

/**
 * Get user operation receipt by hash
 */
export async function getUserOperationReceipt(hash: Hex) {
  const bundlerClient = createBundlerClient({
    chain: baseSepolia,
    transport: modularTransport,
    paymaster: true,
  })

  return bundlerClient.getUserOperationReceipt({ hash })
}
