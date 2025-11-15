# ArcWise

Send cross-chain USDC to friends and split expenses seamlessly across blockchain networks.

## Features

### Send Cross-Chain USDC to Friends
Transfer USDC between supported testnet chains to Arc Testnet using Circle's Bridge Kit. Perfect for sending money to friends across different networks:
- Ethereum Sepolia → Arc Testnet
- Base Sepolia → Arc Testnet
- Arbitrum Sepolia → Arc Testnet

Features include:
- Automatic cheapest route finder
- Fee estimation across all routes
- Send to different wallet addresses
- Real-time balance tracking

### Expense Splitting
Track shared expenses and calculate who owes what. Settle debts with on-chain USDC transfers across multiple networks.

### Circle Smart Account
Create a smart account using your device's biometric authentication touch ID
- No seed phrases or private keys
- Gasless USDC transfers on Base Sepolia
- Secured by passkey technology

### Farcaster Integration
Resolve Ethereum addresses using Farcaster usernames for easier transfers.

## Setup

Install dependencies:
```bash
npm install
```

Create a `.env` file with your API keys:
```bash
# Farcaster username resolution
VITE_NEYNAR_API_KEY=your_neynar_api_key

# Circle Smart Account (optional)
VITE_CLIENT_KEY=your_circle_client_key
VITE_CLIENT_URL=https://modular-sdk.circle.com/v1/rpc/w3s/buidl
```

Get API keys:
- **Neynar**: https://neynar.com
- **Circle**: https://console.circle.com/modular-wallets

## Development

Start the dev server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Tech Stack

- React + TypeScript + Vite
- Circle Bridge Kit - Cross-chain USDC transfers
- Circle Modular Wallets - Passkey-based smart accounts
- RainbowKit + Wagmi - Wallet connections
- Shadcn UI + Tailwind CSS - Interface
