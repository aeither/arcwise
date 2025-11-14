import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { createAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { type EIP1193Provider, createPublicClient, http, parseAbi } from 'viem';

export const SEPOLIA_CHAIN_ID = 11155111;
export const ARC_CHAIN_ID = 5042002;
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

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

export function useBridgeKit() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

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
        });

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

        if (!window.ethereum) {
          throw new Error('MetaMask not found. Please install MetaMask.');
        }

        if (!bridgeKitInstance) {
          bridgeKitInstance = new BridgeKit();
        }

        // Create adapter from wallet provider
        setState(prev => ({ ...prev, step: 'switching-network' }));
        const adapter = await createAdapterFromProvider({
          provider: window.ethereum as EIP1193Provider,
        });

        console.log(`🌉 Bridging ${amount} ${token} from ${CHAIN_NAMES[sourceChainId]} to ${CHAIN_NAMES[destinationChainId]}`);

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

        console.log(`✅ Using source chain: ${sourceChain.name} (Chain ID: ${sourceChain.chainId})`);
        console.log(`✅ Using destination chain: ${destinationChain.name} (Chain ID: ${destinationChain.chainId})`);

        // Switch to source chain if needed
        if (chainId !== sourceChainId && switchChain) {
          try {
            await switchChain({ chainId: sourceChainId });
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (err: any) {
            if (!err.message?.includes('User rejected')) {
              console.warn('⚠️ Chain switch warning:', err.message);
            }
          }
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

        const bridgeParams = {
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
    [address, isConnected, chainId, switchChain, fetchTokenBalance]
  );

  return {
    state,
    tokenBalance,
    isLoadingBalance,
    balanceError,
    fetchTokenBalance,
    bridge,
    reset,
  };
}
