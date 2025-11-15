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

## Challenge Explanation

### Best Cross-Chain USDC Experience with Circle's Bridge Kit and Arc
ArcWise leverages Circle's Bridge Kit to provide a seamless cross-chain USDC transfer experience. Users can send USDC from Ethereum Sepolia, Base Sepolia, and Arbitrum Sepolia to Arc Testnet with automatic route optimization. The app automatically finds the cheapest route, estimates fees across all available routes, and provides real-time balance tracking. This makes sending USDC to friends across different networks as simple as a few clicks, without needing to understand the underlying bridge mechanics.

### Best Stablecoin Embedded Wallet Experience with Circle Wallets, CCTP, Gateway & Arc
ArcWise integrates Circle Modular Wallets to deliver a superior embedded wallet experience. Users can create smart accounts secured by passkey technology (biometric authentication) without managing seed phrases or private keys. The wallet supports gasless USDC transfers on Base Sepolia, making it accessible to users who may not have native tokens for gas fees. ArcWise leverages Circle Gateway, which allows users to deposit USDC to non-custodial smart contracts on any supported source chain to create a unified USDC balance. Once deposits are finalized, the Gateway system provides an attestation with a single API call that enables instant USDC minting on destination chains, allowing next-block access to the full balance. Combined with Farcaster username resolution, users can send USDC to friends using familiar usernames instead of long wallet addresses, creating a social-first payment experience.

## Submission Details

ArcWise is a social payment application that combines expense splitting with cross-chain USDC transfers, built specifically for the Arc ecosystem. The project addresses two key challenges: making cross-chain USDC transfers accessible to everyday users, and providing a seamless embedded wallet experience.

**Key Achievements:**
- Integrated Circle's Bridge Kit for multi-chain USDC transfers to Arc Testnet with automatic route optimization
- Implemented Circle Modular Wallets with passkey authentication for secure, gasless transactions
- Built an expense splitting feature that calculates debts and enables settlement via on-chain transfers
- Added Farcaster integration for human-readable username resolution
- Created an intuitive UI with real-time balance tracking and fee estimation

**Process:**
The application was built using React, TypeScript, and Vite for the frontend, with Circle's Bridge Kit handling cross-chain transfers and Circle Modular Wallets providing the embedded wallet infrastructure. The app supports multiple testnet chains (Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia) all bridging to Arc Testnet, giving users flexibility in how they fund their transfers. The expense splitting feature tracks shared costs and automatically calculates who owes what, with the ability to settle debts directly through cross-chain USDC transfers.

**Technical Highlights:**
- Automatic cheapest route discovery across multiple bridge options
- Real-time fee estimation before transaction execution
- Passkey-based authentication eliminating seed phrase management
- Gasless transfers on supported networks
- Social integration via Farcaster for user-friendly addressing

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
