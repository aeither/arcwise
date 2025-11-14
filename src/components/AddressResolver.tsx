import { useState } from 'react';
import { useAddressResolver } from '@/hooks/useAddressResolver';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

/**
 * Example component demonstrating the useAddressResolver hook
 * Resolves ENS names and Farcaster usernames to Ethereum addresses
 *
 * Examples to try:
 * - vitalik.eth (ENS)
 * - dwr.eth (ENS)
 * - vitalik (Farcaster)
 * - dwr (Farcaster)
 * - 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb (Direct address)
 */
export function AddressResolver() {
  const [inputValue, setInputValue] = useState('');
  const { address, isLoading, error, resolvedVia } = useAddressResolver(inputValue);

  return (
    <div className="space-y-4 p-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="addressInput">
          Enter Address, ENS Name, or Farcaster Username
        </Label>
        <Input
          id="addressInput"
          type="text"
          placeholder="e.g., vitalik.eth, dwr, or 0x..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Try: vitalik.eth (ENS), dwr (Farcaster), or any Ethereum address
        </p>
      </div>

      {isLoading && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription className="ml-2">
            Resolving {inputValue}...
          </AlertDescription>
        </Alert>
      )}

      {error && !isLoading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {address && !isLoading && (
        <Alert className="border-green-500 text-green-700 dark:text-green-400">
          <CheckCircle className="h-4 w-4" />
          <div className="ml-2">
            <AlertDescription className="font-semibold">
              Resolved via {resolvedVia?.toUpperCase()}
            </AlertDescription>
            <p className="text-xs mt-1 font-mono break-all">{address}</p>
          </div>
        </Alert>
      )}
    </div>
  );
}
