/**
 * Hook for reading from smart contracts using Circle Smart Account
 * Based on Circle's Modular Wallets SDK documentation
 */

import { useState, useEffect } from 'react'
import { createPublicClient, type Abi, type Address } from 'viem'
import { baseSepolia } from 'viem/chains'
import { toModularTransport } from '@circle-fin/modular-wallets-core'

const clientKey = import.meta.env.VITE_CLIENT_KEY as string
const clientUrl = import.meta.env.VITE_CLIENT_URL as string

// Create transport and public client for reading
const modularTransport = toModularTransport(`${clientUrl}/baseSepolia`, clientKey)
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: modularTransport,
})

export interface UseSmartAccountContractReadConfig<TAbi extends Abi = Abi> {
  address: Address
  abi: TAbi
  functionName: string
  args?: readonly unknown[]
  enabled?: boolean
  watch?: boolean
  chainId?: number
}

export interface UseSmartAccountContractReadResult<TData = unknown> {
  data: TData | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Read from a smart contract using Circle's Public Client
 *
 * @example
 * const { data, isLoading, error, refetch } = useSmartAccountContractRead({
 *   address: '0x...',
 *   abi: erc20Abi,
 *   functionName: 'balanceOf',
 *   args: [userAddress],
 * })
 */
export function useSmartAccountContractRead<TAbi extends Abi, TData = unknown>(
  config: UseSmartAccountContractReadConfig<TAbi>
): UseSmartAccountContractReadResult<TData> {
  const [data, setData] = useState<TData | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const { address, abi, functionName, args = [], enabled = true, watch = false } = config

  const fetchData = async () => {
    if (!enabled) return

    try {
      setIsLoading(true)
      setError(null)

      const result = await publicClient.readContract({
        address,
        abi,
        functionName,
        args,
      } as any)

      setData(result as TData)
    } catch (err) {
      console.error('Contract read error:', err)
      setError(err instanceof Error ? err : new Error('Failed to read contract'))
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [address, functionName, JSON.stringify(args), enabled])

  // Watch mode - poll every 3 seconds
  useEffect(() => {
    if (!watch || !enabled) return

    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [watch, enabled])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  }
}

/**
 * Get the balance of any address (native token or ERC20)
 *
 * @example
 * const { data: balance } = useSmartAccountBalance({
 *   address: '0x...',
 * })
 */
export function useSmartAccountBalance(config: {
  address: Address
  tokenAddress?: Address
  watch?: boolean
}) {
  const [balance, setBalance] = useState<bigint | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const { address, tokenAddress, watch = false } = config

  const fetchBalance = async () => {
    try {
      setIsLoading(true)
      setError(null)

      let result: bigint

      if (tokenAddress) {
        // ERC20 token balance
        result = await publicClient.readContract({
          address: tokenAddress,
          abi: [
            {
              inputs: [{ name: 'account', type: 'address' }],
              name: 'balanceOf',
              outputs: [{ name: '', type: 'uint256' }],
              stateMutability: 'view',
              type: 'function',
            },
          ],
          functionName: 'balanceOf',
          args: [address],
        } as any) as bigint
      } else {
        // Native token balance (ETH)
        result = await publicClient.getBalance({ address })
      }

      setBalance(result)
    } catch (err) {
      console.error('Balance fetch error:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch balance'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBalance()
  }, [address, tokenAddress])

  useEffect(() => {
    if (!watch) return

    const interval = setInterval(fetchBalance, 3000)
    return () => clearInterval(interval)
  }, [watch])

  return {
    data: balance,
    isLoading,
    error,
    refetch: fetchBalance,
  }
}

/**
 * Get block information
 */
export async function getBlock(blockNumberOrTag?: bigint | 'latest' | 'earliest' | 'pending') {
  return publicClient.getBlock({ blockNumber: blockNumberOrTag as bigint | undefined })
}

/**
 * Get transaction details by hash
 */
export async function getTransaction(hash: `0x${string}`) {
  return publicClient.getTransaction({ hash })
}

/**
 * Call a contract function (view/pure - does not change state)
 */
export async function callContract<TAbi extends Abi>(config: {
  address: Address
  abi: TAbi
  functionName: string
  args?: readonly unknown[]
}) {
  return publicClient.readContract({
    address: config.address,
    abi: config.abi,
    functionName: config.functionName,
    args: config.args || [],
  } as any)
}
