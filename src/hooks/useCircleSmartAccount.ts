import { useState, useEffect, useMemo } from 'react'
import { createPublicClient, parseUnits, formatUnits, type Hex, erc20Abi, type Chain } from 'viem'
import { baseSepolia, arcTestnet, arbitrumSepolia } from 'viem/chains'
import {
  type P256Credential,
  type SmartAccount,
  type WebAuthnAccount,
  createBundlerClient,
  toWebAuthnAccount,
} from 'viem/account-abstraction'
import {
  WebAuthnMode,
  toCircleSmartAccount,
  toModularTransport,
  toPasskeyTransport,
  toWebAuthnCredential,
  encodeTransfer,
  ContractAddress,
} from '@circle-fin/modular-wallets-core'

const clientKey = import.meta.env.VITE_CLIENT_KEY as string
const clientUrl = import.meta.env.VITE_CLIENT_URL as string

const USDC_DECIMALS = 6

// Chain configurations with USDC addresses
const CHAIN_CONFIGS: Record<number, { chain: Chain; path: string; usdcAddress: `0x${string}`; name: string }> = {
  84532: {
    chain: baseSepolia,
    path: 'baseSepolia',
    usdcAddress: ContractAddress.BaseSepolia_USDC,
    name: 'Base Sepolia'
  },
  5042002: {
    chain: arcTestnet,
    path: 'arcTestnet',
    usdcAddress: '0x3600000000000000000000000000000000000000',
    name: 'Arc Testnet'
  },
  421614: {
    chain: arbitrumSepolia,
    path: 'arbitrumSepolia',
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    name: 'Arbitrum Sepolia'
  }
}

// Create Circle transports (passkey transport is chain-agnostic)
const passkeyTransport = toPasskeyTransport(clientUrl, clientKey)

export interface CircleSmartAccountState {
  account: SmartAccount | undefined
  credential: P256Credential | null
  username: string | undefined
  isLoading: boolean
  error: string | null
  userOpHash: Hex | null
  txHash: Hex | null
  currentChainId: number
  currentChainName: string
}

export interface CircleSmartAccountActions {
  register: (username: string) => Promise<void>
  login: () => Promise<void>
  logout: () => void
  sendUSDC: (to: `0x${string}`, amount: string) => Promise<`0x${string}`>
  checkUSDCBalance: () => Promise<string>
  clearTransaction: () => void
}

export function useCircleSmartAccount(chainId: number = 84532): CircleSmartAccountState & CircleSmartAccountActions {
  const [account, setAccount] = useState<SmartAccount | undefined>(undefined)
  const [credential, setCredential] = useState<P256Credential | null>(() =>
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('credential') || 'null') : null
  )
  const [username, setUsername] = useState<string | undefined>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('username') || undefined : undefined
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userOpHash, setUserOpHash] = useState<Hex | null>(null)
  const [txHash, setTxHash] = useState<Hex | null>(null)

  // Get chain configuration
  const chainConfig = useMemo(() => CHAIN_CONFIGS[chainId] || CHAIN_CONFIGS[84532], [chainId])

  // Create clients for the current chain
  const { client, bundlerClient } = useMemo(() => {
    const modularTransport = toModularTransport(`${clientUrl}/${chainConfig.path}`, clientKey)
    
    const newClient = createPublicClient({
      chain: chainConfig.chain,
      transport: modularTransport,
    })

    const newBundlerClient = createBundlerClient({
      chain: chainConfig.chain,
      transport: modularTransport,
      paymaster: true,
    })

    return { client: newClient, bundlerClient: newBundlerClient }
  }, [chainConfig])

  // Create smart account when credential is available or chain changes
  useEffect(() => {
    if (!credential) return

    // Create a circle smart account for the current chain
    toCircleSmartAccount({
      client,
      owner: toWebAuthnAccount({ credential }) as WebAuthnAccount,
      name: username,
    } as any).then(setAccount)
      .catch(err => {
        console.error('Error creating smart account:', err)
        setError(err instanceof Error ? err.message : 'Failed to create smart account')
      })
  }, [credential, username, client])

  const register = async (usernameInput: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const newCredential = await toWebAuthnCredential({
        transport: passkeyTransport,
        mode: WebAuthnMode.Register,
        username: usernameInput,
      })

      localStorage.setItem('credential', JSON.stringify(newCredential))
      localStorage.setItem('username', usernameInput)

      setCredential(newCredential)
      setUsername(usernameInput)
    } catch (err) {
      console.error('Registration error:', err)
      setError(err instanceof Error ? err.message : 'Failed to register')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const login = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const newCredential = await toWebAuthnCredential({
        transport: passkeyTransport,
        mode: WebAuthnMode.Login,
      })

      localStorage.setItem('credential', JSON.stringify(newCredential))

      setCredential(newCredential)

      // Try to get username from storage if available
      const storedUsername = localStorage.getItem('username')
      if (storedUsername) {
        setUsername(storedUsername)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Failed to login')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('credential')
    localStorage.removeItem('username')
    setCredential(null)
    setUsername(undefined)
    setAccount(undefined)
    setError(null)
    setUserOpHash(null)
    setTxHash(null)
  }

  const sendUSDC = async (to: `0x${string}`, amount: string) => {
    if (!account) {
      throw new Error('No account connected')
    }

    try {
      setIsLoading(true)
      setError(null)
      setUserOpHash(null)
      setTxHash(null)

      // Create callData for USDC transfer using current chain's USDC address
      const callData = encodeTransfer(
        to,
        chainConfig.usdcAddress,
        parseUnits(amount, USDC_DECIMALS)
      )

      // Send user operation with paymaster sponsorship
      const hash = await bundlerClient.sendUserOperation({
        account,
        calls: [callData],
        paymaster: true,
      } as any)

      setUserOpHash(hash)

      // Wait for transaction receipt
      const { receipt } = await bundlerClient.waitForUserOperationReceipt({
        hash,
      })

      setTxHash(receipt.transactionHash)

      return receipt.transactionHash
    } catch (err) {
      console.error('Send USDC error:', err)
      setError(err instanceof Error ? err.message : 'Failed to send USDC')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const clearTransaction = () => {
    setUserOpHash(null)
    setTxHash(null)
    setError(null)
  }

  const checkUSDCBalance = async (): Promise<string> => {
    if (!account) {
      throw new Error('No account connected')
    }

    try {
      const balance = await client.readContract({
        address: chainConfig.usdcAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [account.address],
      } as any)

      return formatUnits(balance as bigint, 6) // USDC has 6 decimals
    } catch (err) {
      console.error('Error checking USDC balance:', err)
      throw err
    }
  }

  return {
    account,
    credential,
    username,
    isLoading,
    error,
    userOpHash,
    txHash,
    currentChainId: chainId,
    currentChainName: chainConfig.name,
    register,
    login,
    logout,
    sendUSDC,
    checkUSDCBalance,
    clearTransaction,
  }
}
