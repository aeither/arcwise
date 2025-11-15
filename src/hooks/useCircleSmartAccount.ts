import { useState, useEffect } from 'react'
import { createPublicClient, parseUnits, formatUnits, type Hex, erc20Abi } from 'viem'
import { baseSepolia } from 'viem/chains'
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

// Create Circle transports
const passkeyTransport = toPasskeyTransport(clientUrl, clientKey)
const modularTransport = toModularTransport(`${clientUrl}/baseSepolia`, clientKey)

// Create a public client
const client = createPublicClient({
  chain: baseSepolia,
  transport: modularTransport,
})

// Create a bundler client with the modular transport
const bundlerClient = createBundlerClient({
  chain: baseSepolia,
  transport: modularTransport,
  paymaster: true,
})

export interface CircleSmartAccountState {
  account: SmartAccount | undefined
  credential: P256Credential | null
  username: string | undefined
  isLoading: boolean
  error: string | null
  userOpHash: Hex | null
  txHash: Hex | null
}

export interface CircleSmartAccountActions {
  register: (username: string) => Promise<void>
  login: () => Promise<void>
  logout: () => void
  sendUSDC: (to: `0x${string}`, amount: string) => Promise<`0x${string}`>
  checkUSDCBalance: () => Promise<string>
  clearTransaction: () => void
}

export function useCircleSmartAccount(): CircleSmartAccountState & CircleSmartAccountActions {
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

  // Create smart account when credential is available
  useEffect(() => {
    if (!credential) return

    // Create a circle smart account
    toCircleSmartAccount({
      client,
      owner: toWebAuthnAccount({ credential }) as WebAuthnAccount,
      name: username,
    } as any).then(setAccount)
      .catch(err => {
        console.error('Error creating smart account:', err)
        setError(err instanceof Error ? err.message : 'Failed to create smart account')
      })
  }, [credential, username])

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

      // Create callData for USDC transfer
      const callData = encodeTransfer(
        to,
        ContractAddress.BaseSepolia_USDC,
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
        account: account,
        address: ContractAddress.BaseSepolia_USDC,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [account.address],
        authorizationList: undefined,
      })

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
    register,
    login,
    logout,
    sendUSDC,
    checkUSDCBalance,
    clearTransaction,
  }
}
