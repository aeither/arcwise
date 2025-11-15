# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

ArcWise is a social payment application that enables cross-chain USDC transfers and expense splitting, built with Circle's Bridge Kit and Modular Wallets for the Arc ecosystem. The app supports sending USDC between Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia, and Arc Testnet.

**Core Features:**
- Cross-chain USDC bridging with automatic route optimization
- Circle Smart Accounts with passkey authentication (no seed phrases)
- Gasless USDC transfers on Base Sepolia
- Expense splitting and on-chain debt settlement
- Farcaster username resolution

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Start development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Lint the codebase
npm run lint

# Preview production build
npm run preview
```

### Using Bun
This project uses Bun as the package manager. All npm commands can also be run with `bun`:
```bash
bun install
bun vite
bun vite build
```

## Environment Setup

Create a `.env` file with the following keys (see `.env.example`):
```bash
# Farcaster username resolution
VITE_NEYNAR_API_KEY=your_neynar_api_key

# Circle Smart Account (optional - for passkey features)
VITE_CLIENT_KEY=your_circle_client_key
VITE_CLIENT_URL=https://modular-sdk.circle.com/v1/rpc/w3s/buidl
```

**API Key Sources:**
- Neynar: https://neynar.com
- Circle: https://console.circle.com/modular-wallets

## Architecture

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Shadcn UI components
- **Web3:** Wagmi v2 + Viem v2 + RainbowKit
- **Circle Integration:** Bridge Kit, Modular Wallets SDK, CCTP
- **Routing:** React Router DOM
- **State Management:** TanStack Query

### Directory Structure
```
src/
├── components/       # React components
│   └── ui/          # Shadcn UI components (button, dialog, toast, etc.)
├── hooks/           # Custom React hooks for blockchain interactions
├── lib/             # Utilities and configurations
├── pages/           # Route-level page components
└── App.tsx          # Main app with routing
```

### Key Pages
- `/` (Index) - Expense splitting and dashboard
- `/bridge` - Cross-chain USDC bridging with automatic route finding
- `/circle-account` - Circle Smart Account management (register/login with passkey)
- `/gateway` - Circle Gateway wallet for unified USDC balance
- `/gasless-bridge` - Gasless bridging using Circle Smart Account

### Supported Chains

**Wagmi Configuration** (`src/lib/wagmi-config.ts`):
- Ethereum Sepolia (ID: 11155111)
- Base Sepolia (ID: 84532)
- Arbitrum Sepolia (ID: 421614)
- Arc Testnet (ID: 5042002)
- Avalanche Fuji (ID: 43113)

### USDC Contract Addresses
| Chain | USDC Address |
|-------|--------------|
| Ethereum Sepolia | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| Base Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Arbitrum Sepolia | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Arc Testnet | `0x3600000000000000000000000000000000000000` |

## Core Hooks

### Bridge Kit Hooks

**`useBridgeKit(options?)`** (`src/hooks/useBridgeKit.ts`)
- Primary hook for cross-chain USDC bridging using Circle's Bridge Kit
- Automatically finds cheapest bridge routes
- Supports both wagmi wallets and Circle Smart Accounts (via `accountAddress` option)
- Returns: `{ state, tokenBalance, bridge(), fetchTokenBalance(), reset() }`
- Bridge steps: idle → switching-network → approving → signing-bridge → waiting-receive-message → success/error

### Circle Smart Account Hooks

**`useCircleSmartAccount()`** (`src/hooks/useCircleSmartAccount.ts`)
- Manages Circle Smart Account lifecycle with passkey authentication
- Stores credentials in localStorage
- Works on Base Sepolia with gasless transactions (ERC-4337 + Paymaster)
- Returns: `{ account, credential, username, register(), login(), logout(), sendUSDC(), checkUSDCBalance() }`

**`useSmartAccountContractRead(config)`** (`src/hooks/useSmartAccountContractRead.ts`)
- Read from any smart contract using Circle's Public Client
- Supports polling with `watch: true` option
- Type-safe with Viem ABIs
- Includes helper: `useSmartAccountBalance()` for native/ERC20 balances

**`useSmartAccountContractWrite(config)`** (`src/hooks/useSmartAccountContractWrite.ts`)
- Write to any smart contract with gasless transactions via ERC-4337
- Requires Circle Smart Account to be initialized
- Returns `write()` function and transaction state (userOpHash, txHash)
- Includes helper: `useSmartAccountSendUSDC()` for optimized USDC transfers

See `CIRCLE_SMART_ACCOUNT_HOOKS.md` for detailed documentation and examples.

### Gateway Hooks

**`useGateway(userAddress?, smartAccount?)`** (`src/hooks/useGateway.ts`)
- Manages Circle Gateway for unified USDC balance across chains
- Fetches balances from both Gateway API and on-chain
- Supports deposit/withdraw operations
- Works with both wagmi wallets and Circle Smart Accounts

**`useGaslessBridge()`** (`src/hooks/useGaslessBridge.ts`)
- Bridge USDC using ONLY Circle Smart Account (no MetaMask required)
- All transactions are gasless via Circle's bundler
- Requires Circle Smart Account to be logged in

### Other Hooks

**`useAddressResolver()`** (`src/hooks/useAddressResolver.ts`)
- Resolves Ethereum addresses from Farcaster usernames
- Uses Neynar API
- See `useAddressResolver.md` for details

## Important Patterns

### 1. Dual Wallet Architecture
The app supports two wallet modes:
- **Wagmi Wallets:** Connected via RainbowKit (MetaMask, WalletConnect, etc.)
- **Circle Smart Accounts:** Passkey-based, no seed phrases, gasless on Base Sepolia

Many hooks accept optional parameters to work with either mode:
```typescript
// Example: useBridgeKit can use either wallet type
useBridgeKit({ accountAddress: smartAccount?.address })
```

### 2. Circle Smart Account Flow
```typescript
// 1. Register or login (creates passkey)
await register('username') // or login()

// 2. Smart account is automatically created and stored
// Credential stored in localStorage

// 3. Use smart account for gasless transactions
await sendUSDC(toAddress, '10.00')
```

### 3. Bridge Kit Integration
```typescript
// Bridge Kit needs chain objects from getSupportedChains()
const supportedChains = bridgeKitInstance.getSupportedChains()
const sourceChain = supportedChains.find(c => c.chainId === sourceChainId)

// Bridge with automatic route optimization
await bridge('USDC', '10.00', sourceChainId, destinationChainId, recipientAddress?)
```

### 4. Transaction State Management
All hooks follow consistent state patterns:
- `isLoading` - Operation in progress
- `error` - Error message (null if no error)
- `userOpHash` - ERC-4337 UserOperation hash (Smart Account only)
- `txHash` - Final transaction hash
- `reset()` or `clearTransaction()` - Reset state after completion

### 5. Environment Variables
All Circle SDK and API keys must be prefixed with `VITE_` to be accessible in the browser:
```typescript
import.meta.env.VITE_CLIENT_KEY
import.meta.env.VITE_NEYNAR_API_KEY
```

## Development Guidelines

### Adding New Routes
1. Create page component in `src/pages/`
2. Add route in `src/App.tsx` (above the `*` catch-all route)
3. Add navigation in `src/components/BottomNav.tsx`

### Working with Circle Smart Accounts
- Smart Accounts are chain-specific (currently Base Sepolia)
- Gasless transactions only work on supported chains with configured Paymasters
- Passkeys are stored in browser's WebAuthn credential store
- Credentials are stored in localStorage for session persistence

### Adding New Chains
1. Update `src/lib/wagmi-config.ts` with new chain and transport
2. Add chain ID and USDC address to hook constants:
   - `useBridgeKit.ts` - `CHAIN_TOKENS`, `CHAIN_NAMES`
   - `useGateway.ts` - `SUPPORTED_CHAINS` in gateway-constants
3. Verify Circle Bridge Kit supports the chain

### Testing Bridge Functionality
- Get test USDC from Circle Faucet: https://faucet.circle.com
- Monitor transactions on respective block explorers
- Check `CIRCLE_SMART_ACCOUNT_HOOKS.md` for debugging tips

### Path Alias
The project uses `@/` as an alias for the `src/` directory:
```typescript
import { Button } from '@/components/ui/button'
import { useBridgeKit } from '@/hooks/useBridgeKit'
```

## Deployment Notes

- **Domain Configuration:** After production deployment, update the passkey domain at https://console.circle.com/wallets/modular/configurator/passkey (see `INFO.md`)
- **Build Modes:** Use `npm run build:dev` for development builds with debugging enabled
- **Port:** Dev server runs on port 8080 (configured in `vite.config.ts`)

## Resources

- [Circle Modular Wallets Docs](https://developers.circle.com/wallets/modular/web-sdk)
- [Circle Bridge Kit Docs](https://developers.circle.com/bridge-kit)
- [Circle CCTP Docs](https://developers.circle.com/cctp)
- [Viem Documentation](https://viem.sh)
- [Wagmi Documentation](https://wagmi.sh)
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
