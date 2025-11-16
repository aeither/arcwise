# ArcWise

The easiest way to split expenses and pay friends on Arc. Send cross-chain USDC instantly, settle group costs with one tap, and manage your crypto payments all without bringing your own wallet. Built for Arc, ready for real-world finance.

## Problem

Cross-chain payments are complex, requiring users to manage multiple wallets, understand bridge mechanics, and handle gas fees across different networks. Traditional expense splitting apps lack on-chain settlement, making it difficult to pay friends and settle group costs with crypto.

## Solution

ArcWise provides a seamless cross-chain USDC payment experience with embedded wallets, eliminating the need for users to bring their own wallet. Built on Arc and ready for real-world finance, ArcWise makes it easy to pay friends and settle group costs across multiple chains.

## Features

### Cross-Chain USDC Transfers
- **Bridge Kit Integration**: Move USDC across multiple chains easily (Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia → Arc Testnet)
- **Automatic Route Optimization**: Finds the cheapest route automatically
- **Real-time Fee Estimation**: See costs before you send
- **Easy Payments**: Send to friends using Farcaster usernames or wallet addresses

### Embedded Wallet Experience
- **No Wallet Required**: Get started instantly without bringing your own wallet
- **Gateway Integration**: Unified USDC balance management across all chains
- **Gasless Transactions**: Send USDC on all supported chains without native tokens
- **Passkey Security**: Biometric authentication, no seed phrases or private keys

### Expense Splitting
- Track shared expenses and calculate who owes what
- Settle debts with on-chain USDC transfers
- Best mobile experience for on-the-go expense management

## Built on Arc

ArcWise is built on Arc, ready for real-world finance. The platform leverages Circle's Bridge Kit for seamless cross-chain USDC transfers and Circle Gateway for unified balance management, enabling instant access to funds across all supported chains.

## Challenge Explanation

### Best Cross-Chain USDC Experience with Circle's Bridge Kit and Arc
ArcWise delivers the simplest cross-chain USDC experience on Arc. Users send USDC from Ethereum Sepolia, Base Sepolia, and Arbitrum Sepolia to Arc Testnet with automatic route optimization—no bridge mechanics to understand. The app finds the cheapest route, estimates fees upfront, and tracks balances in real-time, making cross-chain payments as easy as sending a text.

### Best Stablecoin Embedded Wallet Experience with Circle Wallets, Gateway & Arc
ArcWise combines Circle Modular Wallets and Gateway to create a seamless embedded wallet experience on Arc. Users get started instantly with passkey authentication—no seed phrases or private keys. Gateway provides unified USDC balance management across all chains with instant access to funds. Gasless transactions on all supported chains mean users never need native tokens. Combined with Farcaster username resolution, paying friends becomes as simple as using a social app.

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

## Building on Arc: Feedback & Learnings

### Problems Encountered

**Wallets:**
- Wallets don't deploy immediately to all chains—had to figure out actions and wait times for wallets to be enabled on different chains

**Gateway:**
- UX heavily influenced by finality times—on Ethereum very slow, on Arc it's fast for funds to be available

**Bridge Kit:**
- Could be more compatible with Circle ecosystem—no guide or documentation on how to implement Bridge Kit with Wallets for cross-chain gasless in-app wallet experience

**Arc:**
- Some confusion around implementation details, for instance USDC decimals

### Tools & Features We Wish Arc Had

- Easier Bridge Kit compatibility with Wallets for seamless integration
- Instant currency arrival on destination for unified balance with Gateway
- Lower transaction costs—Arc could be cheaper, not much better in tx cost compared to ETH L2s

### General Feedback

**Documentation:**
- Docs are good overall

**Circle Passkeys:**
- Problem with Circle passkeys domain configuration—can only set one domain, need ability to set multiple domains for multiple projects

### Bridge Kit Feature Requests

- Support for other major L1s like Sui, Aptos, Near
- Bebop-like functionality: multiple chain to one chain or one chain to multiple chain in a single bridge transaction

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
- Circle Gateway - Unified USDC balance management
- Circle Modular Wallets - Passkey-based embedded wallets
- RainbowKit + Wagmi - Wallet connections
- Shadcn UI + Tailwind CSS - Interface
