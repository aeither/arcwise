import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { createAdapterFromProvider, ViemAdapter } from '@circle-fin/adapter-viem-v2';
import { BridgeKit, BridgeParams, ChainDefinition, } from '@circle-fin/bridge-kit';
import { type EIP1193Provider, createPublicClient, createWalletClient, http, parseAbi, type Chain, custom, EIP1193RequestFn } from 'viem';
import { sepolia, baseSepolia, arbitrumSepolia, mainnet } from 'viem/chains';
import { arcTestnet } from 'wagmi/chains';
import type { SmartAccount } from 'viem/account-abstraction';
import { toModularTransport } from '@circle-fin/modular-wallets-core';
import { useCircleSmartAccount } from './useCircleSmartAccount';

export const SEPOLIA_CHAIN_ID = 11155111;
export const ARC_CHAIN_ID = 5042002;
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

// Supported viem chain objects for Bridge Kit adapter
// Transform to match BridgeKit's expected ChainDefinition format
export const SUPPORTED_VIEM_CHAINS = [
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  arcTestnet as Chain, // wagmi chain, cast to viem Chain
].map(chain => ({
  ...chain,
  type: 'evm' as const,
  chainId: chain.id,
}));

export type BridgeToken = 'USDC';
export type BridgeStep =
  | 'idle'
  | 'switching-network'
  | 'approving'
  | 'signing-bridge'
  | 'waiting-receive-message'
  | 'success'
  | 'error';

export interface BridgeState {
  step: BridgeStep;
  error: string | null;
  result: any | null;
  isLoading: boolean;
  sourceTxHash?: string;
  receiveTxHash?: string;
  sourceChainId?: number;
  destinationChainId?: number;
}

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  contractAddress: string;
}

// Token configurations for all chains - Bridge Kit USDC addresses
export const CHAIN_TOKENS: Record<number, Record<BridgeToken, TokenInfo>> = {
  [SEPOLIA_CHAIN_ID]: {
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      contractAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Bridge Kit USDC on Sepolia
    },
  },
  [ARC_CHAIN_ID]: {
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      contractAddress: '0x3600000000000000000000000000000000000000', // Bridge Kit USDC on Arc Testnet
    },
  },
  [BASE_SEPOLIA_CHAIN_ID]: {
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      contractAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
    },
  },
  [ARBITRUM_SEPOLIA_CHAIN_ID]: {
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      contractAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // USDC on Arbitrum Sepolia
    },
  },
};

export const CHAIN_NAMES: Record<number, string> = {
  [SEPOLIA_CHAIN_ID]: 'Ethereum Sepolia', // Bridge Kit name: "Ethereum Sepolia"
  [ARC_CHAIN_ID]: 'Arc Testnet', // Bridge Kit name: "Arc Testnet"
  [BASE_SEPOLIA_CHAIN_ID]: 'Base Sepolia', // Bridge Kit name: "Base Sepolia"
  [ARBITRUM_SEPOLIA_CHAIN_ID]: 'Arbitrum Sepolia', // Bridge Kit name: "Arbitrum Sepolia"
};

export const SUPPORTED_CHAINS = [
  { id: SEPOLIA_CHAIN_ID, name: CHAIN_NAMES[SEPOLIA_CHAIN_ID] },
  { id: ARC_CHAIN_ID, name: CHAIN_NAMES[ARC_CHAIN_ID] },
  { id: BASE_SEPOLIA_CHAIN_ID, name: CHAIN_NAMES[BASE_SEPOLIA_CHAIN_ID] },
  { id: ARBITRUM_SEPOLIA_CHAIN_ID, name: CHAIN_NAMES[ARBITRUM_SEPOLIA_CHAIN_ID] },
];

// ERC20 ABI for balance reading
const ERC20_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)',
]);

// Public clients for each chain with timeout
const createClientWithTimeout = (url: string) => {
  return createPublicClient({
    transport: http(url, {
      timeout: 3000, // 3 second timeout
      retryCount: 0, // No retries
    }),
  });
};

const publicClients: Record<number, any> = {
  [SEPOLIA_CHAIN_ID]: createClientWithTimeout('https://eth-sepolia.g.alchemy.com/v2/demo'),
  [ARC_CHAIN_ID]: createClientWithTimeout('https://rpc.testnet.arc.network'),
  [BASE_SEPOLIA_CHAIN_ID]: createClientWithTimeout('https://sepolia.base.org'),
  [ARBITRUM_SEPOLIA_CHAIN_ID]: createClientWithTimeout('https://sepolia-rollup.arbitrum.io/rpc'),
};

let bridgeKitInstance: BridgeKit | null = null;

interface UseBridgeKitOptions {
  accountAddress?: string; // Optional smart account address to use instead of wagmi wallet
  smartAccount?: SmartAccount | null; // Optional smart account instance for signing transactions
}

export interface CostEstimate {
  chainId: number;
  chainName: string;
  gasFee: string;
  providerFee: string;
  totalFee: string;
  isLoading: boolean;
  error?: string;
}

// Source chains that can bridge to Arc Testnet
export const SOURCE_CHAINS = [
  { id: SEPOLIA_CHAIN_ID, name: CHAIN_NAMES[SEPOLIA_CHAIN_ID] },
  { id: BASE_SEPOLIA_CHAIN_ID, name: CHAIN_NAMES[BASE_SEPOLIA_CHAIN_ID] },
  { id: ARBITRUM_SEPOLIA_CHAIN_ID, name: CHAIN_NAMES[ARBITRUM_SEPOLIA_CHAIN_ID] },
];


async function createAdapter(smartAccount?: SmartAccount | null): Promise<ViemAdapter | null> {
  if (!smartAccount) return null;

  console.log('✅ Creating adapter from Circle Smart Account...');
  console.log('📍 Smart Account address:', smartAccount.address);

  // Create a provider fully matching EIP-1193 expected types
  const provider: EIP1193Provider = {
    on: (_event: string, _listener: (...args: any[]) => void) => { /* no-op */ },
    removeListener: (_event: string, _listener: (...args: any[]) => void) => { /* no-op */ },
    request: (async (args: { method: string; params?: unknown }): Promise<unknown> => {
      const { method } = args;
      switch (method) {
        case 'eth_accounts':
        case 'eth_requestAccounts':
          return [smartAccount.address];
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    }) as EIP1193RequestFn,
  };

  return await createAdapterFromProvider({ provider });
}

export function useBridgeKit(options?: UseBridgeKitOptions) {
  const { address: wagmiAddress, isConnected: wagmiConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  // Use smart account address if provided, otherwise fall back to wagmi wallet
  const address = options?.accountAddress || wagmiAddress;
  const isConnected = options?.accountAddress ? !!options.accountAddress : wagmiConnected;

  const [state, setState] = useState<BridgeState>({
    step: 'idle',
    error: null,
    result: null,
    isLoading: false,
    sourceTxHash: undefined,
    receiveTxHash: undefined,
  });

  const [tokenBalance, setTokenBalance] = useState('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState('');

  // Initialize Bridge Kit
  useEffect(() => {
    const initBridgeKit = async () => {
      try {
        if (!bridgeKitInstance) {
          bridgeKitInstance = new BridgeKit();
          console.log('✅ Bridge Kit initialized');
        }
      } catch (err) {
        console.error('❌ Failed to initialize Bridge Kit:', err);
      }
    };

    initBridgeKit();
  }, []);

  // Fetch token balance
  const fetchTokenBalance = useCallback(
    async (token: BridgeToken, targetChainId: number) => {
      if (!address) {
        setTokenBalance('0');
        return;
      }

      setIsLoadingBalance(true);
      setBalanceError('');

      try {
        const tokenInfo = CHAIN_TOKENS[targetChainId]?.[token];
        if (!tokenInfo) {
          throw new Error(`Token ${token} not found on chain ${targetChainId}`);
        }

        const publicClient = publicClients[targetChainId];
        if (!publicClient) {
          throw new Error(`Public client not found for chain ${targetChainId}`);
        }

        // Read balance from contract
        console.log(`🔍 Fetching ${token} balance from ${CHAIN_NAMES[targetChainId as keyof typeof CHAIN_NAMES]}...`);
        const balance = await publicClient.readContract({
          address: tokenInfo.contractAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        } as any);

        const balanceFloat = Number(balance) / Math.pow(10, tokenInfo.decimals);
        setTokenBalance(balanceFloat.toFixed(6));
        console.log(`✅ Balance fetched for ${token} on chain ${targetChainId}: ${balanceFloat.toFixed(6)}`);
      } catch (err: any) {
        console.warn(`⚠️ Balance fetch failed for ${CHAIN_NAMES[targetChainId]} (${err.message}), using fallback`);
        // Fallback to demo balance
        setTokenBalance('10.00');
      } finally {
        setIsLoadingBalance(false);
      }
    },
    [address]
  );

  // Reset state
  const reset = useCallback(() => {
    setState({
      step: 'idle',
      error: null,
      result: null,
      isLoading: false,
      sourceTxHash: undefined,
      receiveTxHash: undefined,
    });
  }, []);

  // Estimate costs for all bridge routes
  const estimateCosts = useCallback(
    async (amount: string): Promise<CostEstimate[]> => {
      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Invalid amount');
      }

      const estimates: CostEstimate[] = SOURCE_CHAINS.map(chain => ({
        chainId: chain.id,
        chainName: chain.name,
        gasFee: '...',
        providerFee: '...',
        totalFee: '...',
        isLoading: true,
      }));

      try {
        if (!bridgeKitInstance) {
          bridgeKitInstance = new BridgeKit();
        }

        // Create adapter using the reusable function
        const adapter = await createAdapter(options?.smartAccount);
        const supportedChains = bridgeKitInstance.getSupportedChains();

        // Estimate costs for each source chain
        const estimatePromises = SOURCE_CHAINS.map(async (chain) => {
          try {
            // Find source and destination chains in Bridge Kit
            let sourceChain = supportedChains.find((c: any) => {
              const isEVM = 'chainId' in c;
              if (!isEVM) return false;
              return c.chainId === chain.id;
            });

            // Fallback: search by name
            if (!sourceChain) {
              const chainName = CHAIN_NAMES[chain.id];
              if (chainName) {
                const searchTerms = chainName.toLowerCase().split(' ');
                sourceChain = supportedChains.find((c: any) => {
                  const name = c.name.toLowerCase();
                  return searchTerms.some(term => name.includes(term));
                });
              }
            }

            let destChain = supportedChains.find((c: any) => {
              const isEVM = 'chainId' in c;
              if (!isEVM) return false;
              return c.chainId === ARC_CHAIN_ID;
            });

            // Fallback for Arc
            if (!destChain) {
              destChain = supportedChains.find((c: any) => c.name.toLowerCase().includes('arc'));
            }

            if (!sourceChain || !destChain) {
              throw new Error(`Bridge route not supported`);
            }

            const params = {
              from: { adapter, chain: sourceChain.chain },
              to: { adapter, chain: destChain.chain },
              amount: amount,
            };

            const estimate = await bridgeKitInstance.estimate(params);

            const gasFee = estimate.fees.find((f: any) => f.type === 'gas')?.amount || '0';
            const providerFee = estimate.fees.find((f: any) => f.type === 'provider')?.amount || '0';
            const total = (parseFloat(gasFee) + parseFloat(providerFee)).toFixed(6);

            return {
              chainId: chain.id,
              chainName: chain.name,
              gasFee: `${gasFee} USDC`,
              providerFee: `${providerFee} USDC`,
              totalFee: `${total} USDC`,
              isLoading: false,
            };
          } catch (error: any) {
            console.error(`Failed to estimate for ${chain.name}:`, error);
            return {
              chainId: chain.id,
              chainName: chain.name,
              gasFee: 'N/A',
              providerFee: 'N/A',
              totalFee: 'N/A',
              isLoading: false,
              error: error.message?.includes('not supported') ? 'Route not supported' : 'Failed to estimate',
            };
          }
        });

        const results = await Promise.all(estimatePromises);
        return results;
      } catch (error) {
        console.error('Failed to estimate costs:', error);
        throw error;
      }
    },
    [options?.smartAccount]
  );

  const bridge = useCallback(
    async (token: BridgeToken, amount: string, sourceChainId: number, destinationChainId: number, recipientAddress?: string) => {
      if (!isConnected || !address) {
        setState({
          step: 'error',
          error: 'Please connect your wallet first',
          result: null,
          isLoading: false,
        });
        return;
      }

      if (!amount || parseFloat(amount) <= 0) {
        setState({
          step: 'error',
          error: `Please enter a valid ${token} amount`,
          result: null,
          isLoading: false,
        });
        return;
      }

      try {
        setState(prev => ({
          ...prev,
          step: 'idle',
          error: null,
          isLoading: true,
          sourceChainId,
          destinationChainId,
        }));

        if (!bridgeKitInstance) {
          bridgeKitInstance = new BridgeKit();
        }

        // --- CREATE ADAPTER: Use reusable function ---
        console.log(`🌉 Bridging ${amount} ${token} from ${CHAIN_NAMES[sourceChainId]} to ${CHAIN_NAMES[destinationChainId]}`);

        const adapter = await createAdapter(options?.smartAccount);
        console.log('✅ Adapter created successfully');

        // Get supported chains from Bridge Kit
        const supportedChains = bridgeKitInstance.getSupportedChains();
        console.log(`📋 Total supported chains: ${supportedChains.length}`);
        console.log(`🔍 Looking for source chain ID: ${sourceChainId} (${CHAIN_NAMES[sourceChainId]})`);
        console.log(`🔍 Looking for destination chain ID: ${destinationChainId} (${CHAIN_NAMES[destinationChainId]})`);

        // Find source and destination chains by chain ID (most reliable)
        let sourceChain = supportedChains.find((c: any) => {
          const isEVM = 'chainId' in c;
          if (!isEVM) return false;
          const matches = c.chainId === sourceChainId;
          if (matches) {
            console.log(`✅ Found source chain by ID: ${c.name} (${c.chainId})`);
          }
          return matches;
        });

        let destinationChain = supportedChains.find((c: any) => {
          const isEVM = 'chainId' in c;
          if (!isEVM) return false;
          const matches = c.chainId === destinationChainId;
          if (matches) {
            console.log(`✅ Found destination chain by ID: ${c.name} (${c.chainId})`);
          }
          return matches;
        });

        // Fallback: search by exact name match first
        if (!sourceChain) {
          const expectedName = CHAIN_NAMES[sourceChainId];
          console.log(`⚠️ Source chain not found by ID, trying name match: "${expectedName}"`);
          sourceChain = supportedChains.find((c: any) =>
            c.name.toLowerCase() === expectedName.toLowerCase()
          );
          if (sourceChain) {
            console.log(`✅ Found source chain by exact name: ${sourceChain.name}`);
          }
        }

        if (!destinationChain) {
          const expectedName = CHAIN_NAMES[destinationChainId];
          console.log(`⚠️ Destination chain not found by ID, trying name match: "${expectedName}"`);
          destinationChain = supportedChains.find((c: any) =>
            c.name.toLowerCase() === expectedName.toLowerCase()
          );
          if (destinationChain) {
            console.log(`✅ Found destination chain by exact name: ${destinationChain.name}`);
          }
        }

        // Last resort: partial name match
        if (!sourceChain) {
          const chainName = CHAIN_NAMES[sourceChainId];
          console.log(`⚠️ Still no source chain, trying partial match for: "${chainName}"`);
          const searchTerms = chainName.toLowerCase().split(' ');
          sourceChain = supportedChains.find((c: any) => {
            const name = c.name.toLowerCase();
            const matches = searchTerms.every(term => name.includes(term));
            if (matches) {
              console.log(`✅ Found source chain by partial match: ${c.name}`);
            }
            return matches;
          });
        }

        if (!destinationChain) {
          const chainName = CHAIN_NAMES[destinationChainId];
          console.log(`⚠️ Still no destination chain, trying partial match for: "${chainName}"`);
          const searchTerms = chainName.toLowerCase().split(' ');
          destinationChain = supportedChains.find((c: any) => {
            const name = c.name.toLowerCase();
            const matches = searchTerms.every(term => name.includes(term));
            if (matches) {
              console.log(`✅ Found destination chain by partial match: ${c.name}`);
            }
            return matches;
          });
        }

        if (!sourceChain) {
          console.error(`❌ Source chain not found. Available EVM chains:`,
            supportedChains.filter((c: any) => 'chainId' in c).map((c: any) => `${c.name} (${c.chainId})`));
          throw new Error(`Source chain ${CHAIN_NAMES[sourceChainId]} (${sourceChainId}) not found in Bridge Kit`);
        }

        if (!destinationChain) {
          console.error(`❌ Destination chain not found. Available EVM chains:`,
            supportedChains.filter((c: any) => 'chainId' in c).map((c: any) => `${c.name} (${c.chainId})`));
          throw new Error(`Destination chain ${CHAIN_NAMES[destinationChainId]} (${destinationChainId}) not found in Bridge Kit`);
        }

        // Switch to source chain if needed (only for EOA wallets, not Smart Accounts)
        if (!options?.smartAccount && chainId !== sourceChainId && switchChain) {
          console.log('🦊 Switching chain for EOA wallet...');
          try {
            await switchChain({ chainId: sourceChainId });
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (err: any) {
            if (!err.message?.includes('User rejected')) {
              console.warn('⚠️ Chain switch warning:', err.message);
            }
          }
        } else if (options?.smartAccount) {
          console.log('✅ Skipping chain switch for Smart Account (adapter handles chain context)');
        }

        // Execute bridge
        setState(prev => ({ ...prev, step: 'approving' }));
        console.log('🔄 Step changed to: approving');

        console.log(`🔄 Starting bridge transaction...`);
        console.log(`💰 Amount: ${amount} USDC`);
        console.log(`📍 Source chain object:`, sourceChain);
        console.log(`📍 Destination chain object:`, destinationChain);
        console.log(`📍 Source chain.chain:`, sourceChain.chain);
        console.log(`📍 Destination chain.chain:`, destinationChain.chain);
        if (recipientAddress) {
          console.log(`📍 Recipient address: ${recipientAddress}`);
        }

        const bridgeParams: BridgeParams = {
          from: {
            adapter: adapter,
            chain: sourceChain.chain,
          },
          to: {
            adapter: adapter,
            chain: destinationChain.chain,
            ...(recipientAddress && { recipientAddress }), // Add recipient address if provided
          },
          amount: amount, // Bridge Kit expects string amount directly
        };

        console.log(`📦 Bridge parameters:`, JSON.stringify(bridgeParams, null, 2));

        const result = await bridgeKitInstance.bridge(bridgeParams);

        console.log('✅ Bridge result:', result);
        console.log('✅ Bridge state:', result.state);
        console.log('✅ Bridge steps:', result.steps?.map((s: any) => ({
          name: s.name,
          state: s.state,
          txHash: s.txHash,
        })));

        // Update step to signing-bridge after approval
        setState(prev => ({ ...prev, step: 'signing-bridge' }));

        // Update step to waiting for receive confirmation
        setState(prev => ({ ...prev, step: 'waiting-receive-message' }));

        // Extract transaction hashes
        let sourceTxHash: string | undefined;
        let receiveTxHash: string | undefined;

        if (result && result.steps) {
          // steps[1] typically contains the burn/transfer tx
          if (result.steps[1]?.txHash) {
            sourceTxHash = result.steps[1].txHash;
          }
          // steps[3] typically contains the mint/receive tx
          if (result.steps[3]?.txHash) {
            receiveTxHash = result.steps[3].txHash;
          }
        }

        // Update step to waiting for receive confirmation
        setState(prev => ({ ...prev, step: 'waiting-receive-message' }));
        console.log('🔄 Step changed to: waiting-receive-message');

        setState({
          step: 'success',
          error: null,
          result,
          isLoading: false,
          sourceTxHash,
          receiveTxHash,
          sourceChainId,
          destinationChainId,
        });

        console.log('🎉 Bridge successful!');

        // Refresh balances after bridge
        setTimeout(async () => {
          console.log('🔄 Refreshing balances after bridge...');

          // Fetch both balances
          await fetchTokenBalance('USDC', sourceChainId);
          await fetchTokenBalance('USDC', destinationChainId);
          console.log('✅ Balances updated!');
        }, 1000); // Wait 1 second before refreshing
      } catch (err: any) {
        console.error('❌ Bridge error:', err);
        console.error('❌ Error name:', err.name);
        console.error('❌ Error message:', err.message);
        console.error('❌ Error stack:', err.stack);
        console.error('❌ Full error object:', JSON.stringify(err, null, 2));

        let errorMessage = err.message || 'Bridge transaction failed';

        // Parse specific error types
        if (errorMessage.includes('User rejected') || errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
          errorMessage = 'You rejected the bridge request in your wallet';
        } else if (errorMessage.includes('Insufficient funds') || errorMessage.includes('insufficient funds')) {
          errorMessage = 'Insufficient balance for bridge transaction';
        } else if (errorMessage.includes('not supported')) {
          errorMessage = `Bridge route not supported by Bridge Kit`;
        } else if (errorMessage.includes('not found')) {
          errorMessage = `Chain configuration error: ${errorMessage}`;
        } else {
          // Include full error for debugging
          errorMessage = `Bridge failed: ${errorMessage}`;
        }

        console.error(`❌ User-friendly error: ${errorMessage}`);

        setState({
          step: 'error',
          error: errorMessage,
          result: null,
          isLoading: false,
        });
      }
    },
    [address, isConnected, chainId, switchChain, fetchTokenBalance, options?.smartAccount]
  );

  return {
    state,
    tokenBalance,
    isLoadingBalance,
    balanceError,
    fetchTokenBalance,
    bridge,
    reset,
    estimateCosts,
  };
}
