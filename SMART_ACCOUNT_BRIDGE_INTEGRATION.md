# Circle Smart Account + Bridge Kit Integration

## Overview

This document explains how Circle Smart Accounts are integrated with Circle's Bridge Kit to enable gasless cross-chain USDC bridging with biometric authentication (Face ID/Touch ID).

## Problem Statement

Previously, the app supported two separate features:
1. **Bridge Kit with Wagmi wallets** (MetaMask) - Cross-chain USDC bridging
2. **Circle Smart Accounts** - Gasless USDC transfers with passkey authentication

However, Smart Accounts could not use the Bridge Kit for cross-chain bridging because Bridge Kit requires a custom adapter.

## Solution

We created a custom `ViemAdapter` that uses the Circle Smart Account as the signer for all Bridge Kit transactions. This allows Smart Accounts to:
- Bridge USDC across chains (Sepolia, Base Sepolia, Arbitrum Sepolia → Arc Testnet)
- Enjoy gasless transactions via Circle's bundler and paymaster
- Authenticate with biometrics instead of MetaMask popups

## Implementation Details

### 1. Updated `useBridgeKit` Hook

**File:** `src/hooks/useBridgeKit.ts`

**Key Changes:**

#### Added Imports
```typescript
import { ViemAdapter } from '@circle-fin/adapter-viem-v2';
import { createWalletClient } from 'viem';
import { sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';
import type { SmartAccount } from 'viem/account-abstraction';
import { toModularTransport } from '@circle-fin/modular-wallets-core';
```

#### Updated Options Interface
```typescript
interface UseBridgeKitOptions {
  accountAddress?: string;
  smartAccount?: SmartAccount | null; // NEW: Accept smart account instance
}
```

#### Conditional Adapter Creation
The hook now checks if a `smartAccount` is provided and creates the appropriate adapter:

**For Smart Accounts:**
```typescript
if (options?.smartAccount) {
  // Create custom ViemAdapter
  adapter = new ViemAdapter(
    {
      getPublicClient: async ({ chain }) => {
        return createPublicClient({
          chain: getViemChain(chain.chainId),
          transport: http(),
        });
      },
      getWalletClient: async ({ chain }) => {
        const chainPath = getChainPath(chain.chainId);
        const transport = toModularTransport(`${clientUrl}/${chainPath}`, clientKey);
        
        return createWalletClient({
          account: options.smartAccount!,
          chain: getViemChain(chain.chainId),
          transport,
        });
      },
    },
    {
      addressContext: 'user-controlled',
      supportedChains: [sepolia, baseSepolia, arbitrumSepolia],
    }
  );
}
```

**For MetaMask/EOA Wallets:**
```typescript
else {
  adapter = await createAdapterFromProvider({
    provider: window.ethereum as EIP1193Provider,
  });
}
```

#### Chain Switching Logic
Smart Accounts don't require manual chain switching (the adapter handles it internally):

```typescript
if (!options?.smartAccount && chainId !== sourceChainId && switchChain) {
  // Only switch chains for EOA wallets
  await switchChain({ chainId: sourceChainId });
}
```

### 2. Updated Bridge Component

**File:** `src/pages/Bridge.tsx`

**Key Change:**

Pass the full `account` object from `useCircleSmartAccount` to `useBridgeKit`:

```typescript
const { account } = useCircleSmartAccount();

const { state, tokenBalance, bridge, reset } = useBridgeKit({
  accountAddress: account?.address,
  smartAccount: account, // Pass the SmartAccount instance
});
```

### 3. Helper Functions

The implementation includes two helper functions:

**`getChainPath(chainId)`**: Maps chain IDs to Circle's transport paths
```typescript
switch (chainId) {
  case SEPOLIA_CHAIN_ID: return 'sepolia';
  case BASE_SEPOLIA_CHAIN_ID: return 'baseSepolia';
  case ARBITRUM_SEPOLIA_CHAIN_ID: return 'arbitrumSepolia';
}
```

**`getViemChain(chainId)`**: Maps chain IDs to Viem chain objects
```typescript
switch (chainId) {
  case SEPOLIA_CHAIN_ID: return sepolia;
  case BASE_SEPOLIA_CHAIN_ID: return baseSepolia;
  case ARBITRUM_SEPOLIA_CHAIN_ID: return arbitrumSepolia;
}
```

## Architecture Flow

### With Circle Smart Account:
```
User → Bridge.tsx → useBridgeKit (with smartAccount)
                          ↓
                  ViemAdapter (custom)
                          ↓
                  createWalletClient
                    (with SmartAccount)
                          ↓
                  toModularTransport
                    (Circle's transport)
                          ↓
                    Bridge Kit
                          ↓
              Bundler + Paymaster (gasless)
                          ↓
                    Blockchain
```

### With MetaMask/EOA:
```
User → Bridge.tsx → useBridgeKit (no smartAccount)
                          ↓
              createAdapterFromProvider
                    (window.ethereum)
                          ↓
                    Bridge Kit
                          ↓
                  User pays gas fees
                          ↓
                    Blockchain
```

## User Experience

### For Smart Account Users:
1. Click "Bridge USDC"
2. Authenticate with Face ID / Touch ID (once per session)
3. Transaction completes gaslessly
4. No MetaMask popups required

### For MetaMask Users:
1. Click "Bridge USDC"
2. Approve USDC spending (MetaMask popup)
3. Sign bridge transaction (MetaMask popup)
4. Sign receive transaction (MetaMask popup)
5. User pays gas fees

## Supported Chains

The integration currently supports:

| Chain | Chain ID | Smart Account Support | Bridge Kit Support |
|-------|----------|----------------------|-------------------|
| Ethereum Sepolia | 11155111 | ✅ | ✅ |
| Base Sepolia | 84532 | ✅ | ✅ |
| Arbitrum Sepolia | 421614 | ✅ | ✅ |
| Arc Testnet | 5042002 | ❌ (destination only) | ✅ |

## Testing Checklist

- [ ] Smart Account can bridge from Sepolia to Arc Testnet
- [ ] Smart Account can bridge from Base Sepolia to Arc Testnet
- [ ] Smart Account can bridge from Arbitrum Sepolia to Arc Testnet
- [ ] MetaMask still works for bridging (fallback)
- [ ] Gasless transactions work (no gas fees charged)
- [ ] Passkey authentication prompts appear
- [ ] Balance updates after successful bridge
- [ ] Error messages display correctly
- [ ] Transaction hashes are tracked and displayed

## Environment Variables Required

```bash
VITE_CLIENT_KEY=your_circle_client_key
VITE_CLIENT_URL=https://modular-sdk.circle.com/v1/rpc/w3s/buidl
```

## Debugging

### Console Logs
The implementation includes comprehensive logging:

```
✅ Creating adapter from Circle Smart Account...
📍 Smart Account address: 0x...
✅ Smart Account adapter created successfully
✅ Skipping chain switch for Smart Account (adapter handles chain context)
🌉 Bridging 10.00 USDC from Ethereum Sepolia to Arc Testnet
```

### Common Issues

**Issue:** "Unsupported chain ID for Circle Smart Account"
- **Cause:** Trying to bridge from an unsupported chain
- **Solution:** Only use Sepolia, Base Sepolia, or Arbitrum Sepolia as source chains

**Issue:** "No smart account connected"
- **Cause:** User hasn't logged in with passkey
- **Solution:** Navigate to `/circle-account` and login/register

**Issue:** "MetaMask not found"
- **Cause:** No wallet connected and no smart account
- **Solution:** Either connect MetaMask or use Circle Smart Account

## Code References

- **Hook Implementation:** `src/hooks/useBridgeKit.ts` (lines 1-570)
- **Component Integration:** `src/pages/Bridge.tsx` (lines 45-55)
- **Smart Account Hook:** `src/hooks/useCircleSmartAccount.ts`
- **Documentation:** `CIRCLE_SMART_ACCOUNT_HOOKS.md`

## Future Enhancements

1. **Multi-chain Smart Account Support**: Currently Smart Accounts are limited to Base Sepolia. Future versions could support deploying Smart Accounts on other chains.

2. **Gasless Bridge Estimation**: Add cost estimation that shows "FREE" for Smart Account users.

3. **Batch Bridging**: Allow users to bridge multiple amounts/tokens in a single transaction.

4. **Smart Account Recovery**: Implement account recovery mechanisms for lost passkeys.

## Resources

- [Circle Modular Wallets Docs](https://developers.circle.com/wallets/modular/web-sdk)
- [Circle Bridge Kit Docs](https://developers.circle.com/bridge-kit)
- [Viem Account Abstraction](https://viem.sh/docs/accounts/account-abstraction)
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
