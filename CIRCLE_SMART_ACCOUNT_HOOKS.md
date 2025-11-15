# Circle Smart Account Hooks Documentation

This document provides comprehensive documentation for the Circle Smart Account hooks, which enable reading from and writing to smart contracts using Circle's Modular Wallets SDK with ERC-4337 Account Abstraction.

## Table of Contents

1. [Overview](#overview)
2. [Reading from Smart Contracts](#reading-from-smart-contracts)
3. [Writing to Smart Contracts](#writing-to-smart-contracts)
4. [Core Smart Account Hook](#core-smart-account-hook)
5. [Examples](#examples)

---

## Overview

The Circle Smart Account implementation uses:
- **Viem** for blockchain interactions
- **Circle Modular Wallets SDK** for account abstraction
- **WebAuthn** for passkey-based authentication
- **ERC-4337** for gasless transactions via Paymaster

### Key Features

- ✅ **Gasless Transactions**: All transactions sponsored by Circle Paymaster
- ✅ **Biometric Auth**: Face ID, Touch ID, Windows Hello support
- ✅ **Type-Safe**: Full TypeScript support with Viem ABIs
- ✅ **Real-time Updates**: Watch mode for live data updates
- ✅ **Error Handling**: Comprehensive error states

---

## Reading from Smart Contracts

### `useSmartAccountContractRead`

Read data from any smart contract using Circle's Public Client.

#### Usage

```typescript
import { useSmartAccountContractRead } from '@/hooks/useSmartAccountContractRead'
import { erc20Abi } from 'viem'

function TokenBalance() {
  const { data, isLoading, error, refetch } = useSmartAccountContractRead({
    address: '0x...',
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress],
    watch: true, // Optional: auto-refresh every 3s
    enabled: true, // Optional: enable/disable the query
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return <div>Balance: {data?.toString()}</div>
}
```

#### API

```typescript
interface UseSmartAccountContractReadConfig<TAbi extends Abi> {
  address: Address          // Contract address
  abi: TAbi                // Contract ABI
  functionName: string      // Function to call
  args?: readonly unknown[] // Function arguments
  enabled?: boolean         // Enable/disable query (default: true)
  watch?: boolean          // Auto-refresh every 3s (default: false)
  chainId?: number         // Chain ID (default: Base Sepolia)
}

interface UseSmartAccountContractReadResult<TData> {
  data: TData | undefined   // Return value from contract
  isLoading: boolean        // Loading state
  error: Error | null       // Error state
  refetch: () => Promise<void> // Manual refetch function
}
```

### `useSmartAccountBalance`

Get the balance of any address (native token or ERC20).

#### Usage

```typescript
import { useSmartAccountBalance } from '@/hooks/useSmartAccountContractRead'

// Native ETH balance
const { data: ethBalance } = useSmartAccountBalance({
  address: '0x...',
  watch: true,
})

// ERC20 token balance
const { data: usdcBalance } = useSmartAccountBalance({
  address: '0x...',
  tokenAddress: '0x...', // USDC contract address
  watch: true,
})
```

### Helper Functions

```typescript
import {
  getBlock,
  getTransaction,
  callContract
} from '@/hooks/useSmartAccountContractRead'

// Get block information
const block = await getBlock('latest')
const specificBlock = await getBlock(123456n)

// Get transaction details
const tx = await getTransaction('0x...')

// Call contract function directly
const result = await callContract({
  address: '0x...',
  abi: contractAbi,
  functionName: 'getValue',
  args: [],
})
```

---

## Writing to Smart Contracts

### `useSmartAccountContractWrite`

Write to any smart contract with gasless transactions via ERC-4337.

#### Usage

```typescript
import { useSmartAccountContractWrite } from '@/hooks/useSmartAccountContractWrite'

function TransferToken() {
  const { write, isLoading, isSuccess, error, userOpHash, txHash } =
    useSmartAccountContractWrite({
      address: '0x...', // Contract address
      abi: erc20Abi,
      functionName: 'transfer',
    })

  const handleTransfer = async () => {
    try {
      const hash = await write({
        args: [recipientAddress, parseUnits('1', 6)],
      })
      console.log('Transaction hash:', hash)
    } catch (err) {
      console.error('Transfer failed:', err)
    }
  }

  return (
    <div>
      <button onClick={handleTransfer} disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Transfer'}
      </button>

      {isSuccess && <div>Success! Tx: {txHash}</div>}
      {error && <div>Error: {error.message}</div>}
    </div>
  )
}
```

#### API

```typescript
interface UseSmartAccountContractWriteConfig<TAbi extends Abi> {
  address: Address      // Contract address
  abi: TAbi            // Contract ABI
  functionName: string  // Function to call
  enabled?: boolean    // Enable/disable (default: true)
}

interface WriteContractArgs {
  args?: readonly unknown[] // Function arguments
  value?: bigint           // ETH value to send
}

interface UseSmartAccountContractWriteResult {
  write: (args?: WriteContractArgs) => Promise<Hex>
  writeAsync: (args?: WriteContractArgs) => Promise<{ hash: Hex, receipt: any }>
  isLoading: boolean
  isSuccess: boolean
  error: Error | null
  userOpHash: Hex | null  // ERC-4337 UserOperation hash
  txHash: Hex | null      // Final transaction hash
  reset: () => void
}
```

### `useSmartAccountSendUSDC`

Optimized hook for sending USDC using Circle's `encodeTransfer`.

#### Usage

```typescript
import { useSmartAccountSendUSDC } from '@/hooks/useSmartAccountContractWrite'
import { ContractAddress } from '@circle-fin/modular-wallets-core'

function SendUSDC() {
  const { sendUSDC, isLoading, isSuccess, txHash } = useSmartAccountSendUSDC()

  const handleSend = async () => {
    try {
      const hash = await sendUSDC({
        to: '0x...',
        amount: '1.5', // Human-readable amount (will be converted to base units)
        usdcAddress: ContractAddress.BaseSepolia_USDC,
      })
      console.log('USDC sent! Hash:', hash)
    } catch (err) {
      console.error('Send failed:', err)
    }
  }

  return (
    <button onClick={handleSend} disabled={isLoading}>
      {isLoading ? 'Sending...' : 'Send 1.5 USDC'}
    </button>
  )
}
```

### Helper Functions

```typescript
import {
  estimateUserOperationGas,
  getUserOperationReceipt
} from '@/hooks/useSmartAccountContractWrite'

// Estimate gas for a UserOp
const gasEstimate = await estimateUserOperationGas({
  account,
  calls: [callData],
})

// Get UserOp receipt
const receipt = await getUserOperationReceipt(userOpHash)
```

---

## Core Smart Account Hook

### `useCircleSmartAccount`

Main hook for managing Circle Smart Account lifecycle.

#### Usage

```typescript
import { useCircleSmartAccount } from '@/hooks/useCircleSmartAccount'

function SmartAccountManager() {
  const {
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
  } = useCircleSmartAccount()

  // Register new account
  const handleRegister = async () => {
    await register('myusername')
  }

  // Login with existing passkey
  const handleLogin = async () => {
    await login()
  }

  // Logout
  const handleLogout = () => {
    logout()
  }

  return (
    <div>
      {!credential ? (
        <>
          <button onClick={handleRegister}>Register</button>
          <button onClick={handleLogin}>Login</button>
        </>
      ) : (
        <>
          <p>Address: {account?.address}</p>
          <p>Username: {username}</p>
          <button onClick={handleLogout}>Logout</button>
        </>
      )}
    </div>
  )
}
```

#### API

```typescript
interface CircleSmartAccountState {
  account: SmartAccount | undefined
  credential: P256Credential | null
  username: string | undefined
  isLoading: boolean
  error: string | null
  userOpHash: Hex | null
  txHash: Hex | null
}

interface CircleSmartAccountActions {
  register: (username: string) => Promise<void>
  login: () => Promise<void>
  logout: () => void
  sendUSDC: (to: `0x${string}`, amount: string) => Promise<void>
  checkUSDCBalance: () => Promise<string>
  clearTransaction: () => void
}
```

---

## Examples

### Example 1: Read ERC20 Balance

```typescript
import { useSmartAccountContractRead } from '@/hooks/useSmartAccountContractRead'
import { erc20Abi, formatUnits } from 'viem'

function USDCBalance({ address }: { address: string }) {
  const { data: balance, isLoading } = useSmartAccountContractRead({
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
    watch: true,
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      USDC Balance: {formatUnits(balance as bigint, 6)} USDC
    </div>
  )
}
```

### Example 2: Transfer ERC20 Tokens (Gasless)

```typescript
import { useSmartAccountContractWrite } from '@/hooks/useSmartAccountContractWrite'
import { parseUnits, erc20Abi } from 'viem'

function TransferUSDC() {
  const { write, isLoading, isSuccess } = useSmartAccountContractWrite({
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC
    abi: erc20Abi,
    functionName: 'transfer',
  })

  const handleTransfer = async () => {
    await write({
      args: ['0xRecipient...', parseUnits('10', 6)], // Send 10 USDC
    })
  }

  return (
    <button onClick={handleTransfer} disabled={isLoading}>
      {isLoading ? 'Sending...' : 'Send 10 USDC (Gasless)'}
    </button>
  )
}
```

### Example 3: Call Custom Contract Function

```typescript
import { useSmartAccountContractWrite } from '@/hooks/useSmartAccountContractWrite'

const myContractAbi = [
  {
    name: 'updateValue',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'newValue', type: 'uint256' },
      { name: 'description', type: 'string' }
    ],
    outputs: [],
  }
]

function UpdateContract() {
  const { write, isLoading } = useSmartAccountContractWrite({
    address: '0xYourContract...',
    abi: myContractAbi,
    functionName: 'updateValue',
  })

  const handleUpdate = async () => {
    await write({
      args: [42n, 'New description'],
    })
  }

  return (
    <button onClick={handleUpdate} disabled={isLoading}>
      Update Value (Gasless)
    </button>
  )
}
```

### Example 4: Watch Multiple Balances

```typescript
import { useSmartAccountBalance } from '@/hooks/useSmartAccountContractRead'
import { formatEther, formatUnits } from 'viem'

function BalanceDashboard({ address }: { address: string }) {
  // Native ETH balance
  const { data: ethBalance } = useSmartAccountBalance({
    address,
    watch: true,
  })

  // USDC balance
  const { data: usdcBalance } = useSmartAccountBalance({
    address,
    tokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    watch: true,
  })

  return (
    <div>
      <div>ETH: {ethBalance ? formatEther(ethBalance) : '0'}</div>
      <div>USDC: {usdcBalance ? formatUnits(usdcBalance, 6) : '0'}</div>
    </div>
  )
}
```

### Example 5: Read from Multiple Contracts

```typescript
function MultiContractRead() {
  const { data: totalSupply } = useSmartAccountContractRead({
    address: '0x...',
    abi: erc20Abi,
    functionName: 'totalSupply',
  })

  const { data: name } = useSmartAccountContractRead({
    address: '0x...',
    abi: erc20Abi,
    functionName: 'name',
  })

  const { data: decimals } = useSmartAccountContractRead({
    address: '0x...',
    abi: erc20Abi,
    functionName: 'decimals',
  })

  return (
    <div>
      <div>Token: {name}</div>
      <div>Decimals: {decimals}</div>
      <div>Supply: {totalSupply?.toString()}</div>
    </div>
  )
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Your dApp Components                   │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
   ┌────▼─────┐         ┌──────▼──────┐
   │   Read   │         │    Write    │
   │  Hooks   │         │    Hooks    │
   └────┬─────┘         └──────┬──────┘
        │                      │
   ┌────▼──────────────────────▼───────┐
   │   Circle Modular Wallets SDK      │
   │   (toModularTransport)            │
   └────┬──────────────────────────────┘
        │
   ┌────▼──────────────┬────────────────┐
   │                   │                 │
┌──▼───────────┐  ┌───▼──────────┐  ┌──▼──────────┐
│ Public       │  │ Bundler      │  │ Passkey     │
│ Client       │  │ Client       │  │ Transport   │
│ (Read)       │  │ (Write/AA)   │  │ (Auth)      │
└──────────────┘  └──────────────┘  └─────────────┘
       │                 │                  │
   ┌───▼─────────────────▼──────────────────▼───┐
   │         Blockchain (Base Sepolia)          │
   └────────────────────────────────────────────┘
```

---

## Best Practices

1. **Always check account existence** before writing:
   ```typescript
   if (!account) {
     throw new Error('No smart account connected')
   }
   ```

2. **Use watch mode** for real-time balance updates:
   ```typescript
   const { data } = useSmartAccountContractRead({
     // ...
     watch: true, // Auto-refresh every 3s
   })
   ```

3. **Handle errors gracefully**:
   ```typescript
   const { write, error } = useSmartAccountContractWrite(config)

   try {
     await write(args)
   } catch (err) {
     // Handle error
     toast.error(error?.message || 'Transaction failed')
   }
   ```

4. **Clear transaction state** after success:
   ```typescript
   const { reset } = useSmartAccountContractWrite(config)

   if (isSuccess) {
     setTimeout(reset, 3000) // Clear after 3s
   }
   ```

5. **Use TypeScript ABIs** for type safety:
   ```typescript
   import { erc20Abi } from 'viem'

   const { data } = useSmartAccountContractRead({
     abi: erc20Abi, // Full type inference
     functionName: 'balanceOf', // Autocomplete works!
   })
   ```

---

## Supported Networks

Currently configured for **Base Sepolia** testnet. To add more networks:

```typescript
// Update transport URL
const transport = toModularTransport(
  `${clientUrl}/ethereum`,  // Ethereum mainnet
  clientKey
)

// Update chain
import { mainnet } from 'viem/chains'
const client = createPublicClient({
  chain: mainnet,
  transport,
})
```

Supported networks by Circle:
- Ethereum (mainnet & Sepolia)
- Polygon (mainnet & Amoy)
- Base (mainnet & Sepolia)
- Optimism (mainnet & Sepolia)
- Arbitrum (mainnet & Sepolia)
- Avalanche (mainnet & Fuji)

---

## Troubleshooting

### "No smart account connected"
- Make sure user has registered or logged in
- Check that `credential` exists in localStorage

### "Insufficient funds"
- Fund the smart account with test USDC from [Circle Faucet](https://faucet.circle.com)
- For gasless transactions, ensure Gas Station policy is configured

### "Transaction failed"
- Check console for detailed error logs
- Verify contract address and ABI are correct
- Ensure function arguments match ABI types

### "Balance not updating"
- Use `watch: true` for auto-refresh
- Call `refetch()` manually after transactions
- Wait for block confirmation (2-3 seconds)

---

## Resources

- [Circle Modular Wallets Docs](https://developers.circle.com/wallets/modular/web-sdk)
- [Viem Documentation](https://viem.sh)
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [WebAuthn Guide](https://webauthn.guide/)
