import { useEffect, useState } from 'react';
import { useEnsAddress } from 'wagmi';
import { isAddress } from 'viem';

interface AddressResolverResult {
  address: string | null;
  isLoading: boolean;
  error: string | null;
  resolvedVia: 'address' | 'ens' | 'farcaster' | null;
}

interface FarcasterUserResponse {
  user: {
    fid: number;
    username: string;
    custody_address: string;
    verified_addresses?: {
      eth_addresses?: string[];
      primary?: {
        eth_address?: string | null;
      };
    };
  };
}

/**
 * Hook to resolve addresses from ENS names or Farcaster usernames
 * Priority: Direct address > ENS > Farcaster
 *
 * @param input - Can be an Ethereum address, ENS name, or Farcaster username
 * @param enabled - Whether to enable resolution (default: true)
 * @returns Resolved address, loading state, error, and resolution method
 */
export function useAddressResolver(
  input: string | undefined,
  enabled: boolean = true
): AddressResolverResult {
  const [farcasterAddress, setFarcasterAddress] = useState<string | null>(null);
  const [isLoadingFarcaster, setIsLoadingFarcaster] = useState(false);
  const [farcasterError, setFarcasterError] = useState<string | null>(null);
  const [shouldTryFarcaster, setShouldTryFarcaster] = useState(false);

  // Normalize input
  const normalizedInput = input?.trim();

  // Check if input is already a valid address
  const isValidAddress = normalizedInput ? isAddress(normalizedInput) : false;

  // Try ENS resolution only if input looks like an ENS name (contains a dot)
  const shouldTryEns = !isValidAddress && normalizedInput?.includes('.') && enabled;

  const {
    data: ensAddress,
    isError: ensError,
    isLoading: isLoadingEns,
  } = useEnsAddress({
    name: shouldTryEns ? normalizedInput : undefined,
    query: {
      enabled: shouldTryEns,
    },
  });

  // Fetch Farcaster address
  useEffect(() => {
    // Don't try Farcaster if:
    // - Hook is disabled
    // - Input is empty
    // - Input is already a valid address
    // - ENS is still loading
    // - ENS resolved successfully
    if (
      !enabled ||
      !normalizedInput ||
      isValidAddress ||
      isLoadingEns ||
      (shouldTryEns && ensAddress)
    ) {
      return;
    }

    // Only try Farcaster if ENS failed or wasn't attempted
    if (!shouldTryEns || (ensError && !ensAddress)) {
      setShouldTryFarcaster(true);
    }
  }, [enabled, normalizedInput, isValidAddress, isLoadingEns, ensAddress, ensError, shouldTryEns]);

  useEffect(() => {
    if (!shouldTryFarcaster) {
      return;
    }

    const fetchFarcasterAddress = async () => {
      setIsLoadingFarcaster(true);
      setFarcasterError(null);
      setFarcasterAddress(null);

      try {
        const apiKey = import.meta.env.VITE_NEYNAR_API_KEY;

        if (!apiKey) {
          throw new Error('Neynar API key not configured');
        }

        const response = await fetch(
          `https://api.neynar.com/v2/farcaster/user/by_username?username=${encodeURIComponent(normalizedInput!)}`,
          {
            headers: {
              'x-api-key': apiKey,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Farcaster username not found');
          }
          throw new Error(`Failed to resolve Farcaster username: ${response.statusText}`);
        }

        const data: FarcasterUserResponse = await response.json();

        // Try to get verified primary address first, then custody address
        const resolvedAddress =
          data.user.verified_addresses?.primary?.eth_address ||
          data.user.verified_addresses?.eth_addresses?.[0] ||
          data.user.custody_address;

        if (resolvedAddress && isAddress(resolvedAddress)) {
          setFarcasterAddress(resolvedAddress);
        } else {
          throw new Error('No valid Ethereum address found for Farcaster user');
        }
      } catch (err) {
        setFarcasterError(err instanceof Error ? err.message : 'Failed to resolve Farcaster username');
      } finally {
        setIsLoadingFarcaster(false);
      }
    };

    fetchFarcasterAddress();
  }, [shouldTryFarcaster, normalizedInput]);

  // Determine final result
  if (!enabled || !normalizedInput) {
    return {
      address: null,
      isLoading: false,
      error: null,
      resolvedVia: null,
    };
  }

  // If input is already a valid address
  if (isValidAddress) {
    return {
      address: normalizedInput,
      isLoading: false,
      error: null,
      resolvedVia: 'address',
    };
  }

  // If ENS is loading
  if (isLoadingEns) {
    return {
      address: null,
      isLoading: true,
      error: null,
      resolvedVia: null,
    };
  }

  // If ENS resolved successfully
  if (ensAddress) {
    return {
      address: ensAddress,
      isLoading: false,
      error: null,
      resolvedVia: 'ens',
    };
  }

  // If Farcaster is loading
  if (isLoadingFarcaster) {
    return {
      address: null,
      isLoading: true,
      error: null,
      resolvedVia: null,
    };
  }

  // If Farcaster resolved successfully
  if (farcasterAddress) {
    return {
      address: farcasterAddress,
      isLoading: false,
      error: null,
      resolvedVia: 'farcaster',
    };
  }

  // If both failed
  const errorMessage =
    ensError && farcasterError
      ? `Could not resolve "${normalizedInput}" as ENS or Farcaster username`
      : ensError
      ? `Could not resolve ENS name: ${normalizedInput}`
      : farcasterError
      ? farcasterError
      : null;

  return {
    address: null,
    isLoading: false,
    error: errorMessage,
    resolvedVia: null,
  };
}
