# useAddressResolver Hook

A React hook that resolves Ethereum addresses from multiple sources: direct addresses, ENS names, and Farcaster usernames.

## Features

- **Multi-source resolution**: Handles Ethereum addresses, ENS names, and Farcaster usernames
- **Smart prioritization**: Direct address > ENS > Farcaster
- **Wagmi integration**: Uses wagmi's `useEnsAddress` for ENS resolution
- **Neynar API**: Leverages Neynar API for Farcaster username resolution
- **TypeScript support**: Fully typed with helpful interfaces
- **Error handling**: Clear error messages for different failure scenarios

## Installation

1. Add the Neynar API key to your `.env` file:

```bash
VITE_NEYNAR_API_KEY=your_api_key_here
```

2. Ensure wagmi is properly configured in your app.

## Usage

### Basic Example

```tsx
import { useAddressResolver } from '@/hooks/useAddressResolver';

function MyComponent() {
  const { address, isLoading, error, resolvedVia } = useAddressResolver('vitalik.eth');

  if (isLoading) return <div>Resolving...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!address) return <div>No address found</div>;

  return (
    <div>
      <p>Resolved via: {resolvedVia}</p>
      <p>Address: {address}</p>
    </div>
  );
}
```

### With User Input

```tsx
import { useState } from 'react';
import { useAddressResolver } from '@/hooks/useAddressResolver';

function AddressInput() {
  const [input, setInput] = useState('');
  const { address, isLoading, error, resolvedVia } = useAddressResolver(input);

  return (
    <div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Address, ENS, or Farcaster username"
      />
      {isLoading && <p>Resolving...</p>}
      {error && <p className="error">{error}</p>}
      {address && (
        <p>
          {address} (via {resolvedVia})
        </p>
      )}
    </div>
  );
}
```

### Conditional Resolution

```tsx
const [shouldResolve, setShouldResolve] = useState(false);
const { address, isLoading, error } = useAddressResolver(input, shouldResolve);
```

## API

### Parameters

```typescript
useAddressResolver(input?: string, enabled?: boolean): AddressResolverResult
```

- **input** (optional): The string to resolve. Can be:
  - An Ethereum address (e.g., `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`)
  - An ENS name (e.g., `vitalik.eth`)
  - A Farcaster username (e.g., `dwr`)
- **enabled** (optional, default: `true`): Whether to enable resolution

### Return Value

```typescript
interface AddressResolverResult {
  address: string | null;          // Resolved Ethereum address
  isLoading: boolean;               // Loading state
  error: string | null;             // Error message if resolution failed
  resolvedVia: 'address' | 'ens' | 'farcaster' | null;  // Resolution method
}
```

## Resolution Flow

1. **Check if valid address**: If input is already a valid Ethereum address, return immediately
2. **Try ENS resolution**: If input contains a dot (.), attempt ENS resolution via wagmi
3. **Try Farcaster resolution**: If ENS fails or wasn't attempted, query Neynar API
4. **Return result**: Return the first successful resolution or error

## Farcaster Resolution Details

For Farcaster usernames, the hook attempts to resolve addresses in this order:

1. Primary verified ETH address
2. First verified ETH address
3. Custody address

## Examples

| Input | Resolution Method | Result |
|-------|------------------|--------|
| `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb` | Direct address | Returns immediately |
| `vitalik.eth` | ENS | Resolves via wagmi |
| `dwr.eth` | ENS | Resolves via wagmi |
| `vitalik` | Farcaster | Resolves via Neynar API |
| `dwr` | Farcaster | Resolves via Neynar API |
| `invalid-name` | None | Returns error |

## Error Handling

The hook provides clear error messages:

- `"Could not resolve [input] as ENS or Farcaster username"`: Both methods failed
- `"Farcaster username not found"`: Username doesn't exist on Farcaster
- `"Neynar API key not configured"`: Missing API key in environment
- `"No valid Ethereum address found for Farcaster user"`: User has no ETH address

## Notes

- ENS resolution requires a configured wagmi provider
- Farcaster resolution requires the `VITE_NEYNAR_API_KEY` environment variable
- The hook is optimized to avoid unnecessary API calls
- Resolution is cached by wagmi and React's built-in mechanisms
