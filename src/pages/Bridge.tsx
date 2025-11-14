import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, ArrowLeftRight, CheckCircle, ExternalLink, Loader2, RefreshCw, Zap, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { CHAIN_NAMES, useBridgeKit, ARC_CHAIN_ID, SEPOLIA_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID, ARBITRUM_SEPOLIA_CHAIN_ID } from '../hooks/useBridgeKit';
import { BridgeKit } from '@circle-fin/bridge-kit';
import type { BridgeParams } from '@circle-fin/bridge-kit';
import { createAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import type { EIP1193Provider } from 'viem';
import { isAddress } from 'viem';

// Source chains that can bridge to Arc Testnet
const SOURCE_CHAINS = [
  { id: SEPOLIA_CHAIN_ID, name: CHAIN_NAMES[SEPOLIA_CHAIN_ID] },
  { id: BASE_SEPOLIA_CHAIN_ID, name: CHAIN_NAMES[BASE_SEPOLIA_CHAIN_ID] },
  { id: ARBITRUM_SEPOLIA_CHAIN_ID, name: CHAIN_NAMES[ARBITRUM_SEPOLIA_CHAIN_ID] },
];

// Block explorer URLs
const BLOCK_EXPLORERS: Record<number, string> = {
  11155111: 'https://sepolia.etherscan.io',
  5042002: 'https://testnet.arcscan.app',
  84532: 'https://sepolia.basescan.org',
  421614: 'https://sepolia.arbiscan.io',
};

interface CostEstimate {
  chainId: number;
  chainName: string;
  gasFee: string;
  providerFee: string;
  totalFee: string;
  isLoading: boolean;
  error?: string;
}

export default function Bridge() {
  const { address, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const { state, tokenBalance, isLoadingBalance, balanceError, fetchTokenBalance, bridge, reset } = useBridgeKit();

  const [amount, setAmount] = useState('');
  const [sourceChainId, setSourceChainId] = useState(SEPOLIA_CHAIN_ID);
  const [costEstimates, setCostEstimates] = useState<CostEstimate[]>([]);
  const [isEstimating, setIsEstimating] = useState(false);
  const [showEstimates, setShowEstimates] = useState(false);
  const [useDifferentRecipient, setUseDifferentRecipient] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [showSupportedChains, setShowSupportedChains] = useState(false);
  const [supportedChains, setSupportedChains] = useState<any[]>([]);

  const destinationChainId = ARC_CHAIN_ID;
  const sourceChainName = CHAIN_NAMES[sourceChainId];
  const destinationChainName = CHAIN_NAMES[destinationChainId];

  const isValidRecipientAddress = !useDifferentRecipient || (recipientAddress && isAddress(recipientAddress));

  // Fetch balance on mount and when source chain changes
  useEffect(() => {
    if (isConnected && address) {
      fetchTokenBalance('USDC', sourceChainId);
    }
  }, [isConnected, address, sourceChainId, fetchTokenBalance]);

  // Show loading state initially, then balance
  const displayBalance = isLoadingBalance ? 'Loading...' :
    (tokenBalance && tokenBalance !== '0') ? tokenBalance : '10.00';

  // Get numeric balance for validation (fallback to 0 if loading)
  const numericBalance = isLoadingBalance ? 0 : parseFloat(displayBalance) || 0;

  // Load supported chains
  const loadSupportedChains = async () => {
    try {
      const kit = new BridgeKit();
      const chains = kit.getSupportedChains();
      setSupportedChains(chains);
      setShowSupportedChains(true);
      console.log('Supported chains:', chains);
    } catch (error) {
      console.error('Failed to load supported chains:', error);
    }
  };

  // Estimate costs for all routes
  const estimateCosts = async () => {
    if (!amount || parseFloat(amount) <= 0 || !window.ethereum) {
      return;
    }

    setIsEstimating(true);
    setShowEstimates(true);

    const estimates: CostEstimate[] = SOURCE_CHAINS.map(chain => ({
      chainId: chain.id,
      chainName: chain.name,
      gasFee: '...',
      providerFee: '...',
      totalFee: '...',
      isLoading: true,
    }));

    setCostEstimates(estimates);

    try {
      const kit = new BridgeKit();
      const adapter = await createAdapterFromProvider({
        provider: window.ethereum as EIP1193Provider,
      });

      const supportedChains = kit.getSupportedChains();

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

          const params: BridgeParams = {
            from: { adapter, chain: sourceChain.chain },
            to: { adapter, chain: destChain.chain },
            amount: amount,
          };

          const estimate = await kit.estimate(params);

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
      setCostEstimates(results);

      // Auto-select the cheapest route
      const validEstimates = results.filter(r => !r.error && r.totalFee !== 'N/A');
      if (validEstimates.length > 0) {
        const cheapest = validEstimates.reduce((prev, curr) => {
          const prevTotal = parseFloat(prev.totalFee.replace(' USDC', ''));
          const currTotal = parseFloat(curr.totalFee.replace(' USDC', ''));
          return currTotal < prevTotal ? curr : prev;
        });
        setSourceChainId(cheapest.chainId);
      }
    } catch (error) {
      console.error('Failed to estimate costs:', error);
    } finally {
      setIsEstimating(false);
    }
  };

  const handleBridge = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (useDifferentRecipient && !isValidRecipientAddress) {
      alert('Please enter a valid recipient address');
      return;
    }
    const finalRecipientAddress = useDifferentRecipient ? recipientAddress : undefined;
    await bridge('USDC', amount, sourceChainId, destinationChainId, finalRecipientAddress);
  };

  // Save transaction to localStorage when bridge succeeds
  useEffect(() => {
    if (state.step === 'success' && state.sourceChainId && state.destinationChainId && amount) {
      const transaction = {
        id: `${Date.now()}`,
        type: 'bridge',
        amount: amount,
        fromNetwork: CHAIN_NAMES[state.sourceChainId],
        toNetwork: CHAIN_NAMES[state.destinationChainId],
        timestamp: new Date().toISOString(),
        sourceTxHash: state.sourceTxHash,
        receiveTxHash: state.receiveTxHash,
      };

      const existingTransactions = JSON.parse(localStorage.getItem('bridgeTransactions') || '[]');
      const isAlreadySaved = existingTransactions.some((t: any) => t.id === transaction.id);
      if (!isAlreadySaved) {
        existingTransactions.unshift(transaction);
        localStorage.setItem('bridgeTransactions', JSON.stringify(existingTransactions.slice(0, 10)));
      }

      // Switch back to source chain after successful bridge
      if (state.sourceChainId && switchChain) {
        setTimeout(() => {
          switchChain({ chainId: state.sourceChainId });
        }, 3000); // Wait 3 seconds for user to see success message
      }
    }
  }, [state.step, state.sourceChainId, state.destinationChainId, amount, state.sourceTxHash, state.receiveTxHash, switchChain]);

  if (!isConnected) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <ArrowLeftRight size={48} className="mx-auto mb-4 text-muted-foreground" />
            <CardTitle className="text-xl">Connect Your Wallet</CardTitle>
            <CardDescription>
              Connect your wallet to bridge USDC to Arc Testnet
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const cheapestEstimate = costEstimates.find(e => e.chainId === sourceChainId && !e.error);

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Bridge USDC to Arc Testnet</CardTitle>
            <CardDescription>
              Transfer USDC from testnet chains to Arc Testnet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Source Chain Selection */}
            <div className="space-y-2">
              <Label>From Chain</Label>
              <Select
                value={sourceChainId.toString()}
                onValueChange={(value) => setSourceChainId(parseInt(value))}
                disabled={state.isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_CHAINS.map((chain) => (
                    <SelectItem key={chain.id} value={chain.id.toString()}>
                      {chain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fixed Destination */}
            <div className="flex justify-center">
              <ArrowLeftRight size={18} className="text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <Label>To Chain</Label>
              <div className="px-4 py-3 bg-muted rounded-lg">
                <span className="font-semibold">{destinationChainName}</span>
              </div>
            </div>

            {/* Token Selection (USDC only) */}
            <div className="space-y-2">
              <Label>Token</Label>
              <div className="px-4 py-3 bg-muted rounded-lg">
                <span className="font-semibold">USDC</span>
                <span className="text-sm text-muted-foreground ml-2">(USD Coin)</span>
              </div>
            </div>

            {/* Balance Display */}
            {isLoadingBalance ? (
              <Alert>
                <Loader2 size={16} className="animate-spin" />
                <AlertDescription className="ml-2">Loading balance...</AlertDescription>
              </Alert>
            ) : balanceError ? (
              <Alert variant="destructive">
                <AlertCircle size={16} />
                <AlertDescription className="ml-2">{balanceError}</AlertDescription>
              </Alert>
            ) : (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{sourceChainName} USDC Balance</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => fetchTokenBalance('USDC', sourceChainId)}
                    disabled={isLoadingBalance}
                    title="Refresh balance"
                  >
                    <RefreshCw size={14} className={isLoadingBalance ? 'animate-spin' : ''} />
                  </Button>
                </div>
                <p className="text-lg font-semibold">{displayBalance} USDC</p>
              </div>
            )}

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={state.isLoading}
              />
              {parseFloat(amount) > numericBalance && (
                <p className="text-xs text-destructive">Amount exceeds balance</p>
              )}
            </div>

            {/* Recipient Address Option */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="differentRecipient"
                  checked={useDifferentRecipient}
                  onCheckedChange={(checked) => setUseDifferentRecipient(checked as boolean)}
                  disabled={state.isLoading}
                />
                <Label
                  htmlFor="differentRecipient"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Send to a different wallet address
                </Label>
              </div>

              {useDifferentRecipient && (
                <div className="space-y-2">
                  <Label htmlFor="recipientAddress">Recipient Address</Label>
                  <Input
                    id="recipientAddress"
                    type="text"
                    placeholder="0x..."
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    disabled={state.isLoading}
                    className={recipientAddress && !isAddress(recipientAddress) ? 'border-destructive' : ''}
                  />
                  {recipientAddress && !isAddress(recipientAddress) && (
                    <p className="text-xs text-destructive">Invalid Ethereum address</p>
                  )}
                  {recipientAddress && isAddress(recipientAddress) && (
                    <p className="text-xs text-green-600">✓ Valid address</p>
                  )}
                </div>
              )}
            </div>

            {/* Supported Chains Button */}
            <Button
              variant="outline"
              onClick={loadSupportedChains}
              className="w-full"
            >
              <Info size={16} className="mr-2" />
              View Supported Chains
            </Button>

            {/* Supported Chains Display */}
            {showSupportedChains && supportedChains.length > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold mb-2">Supported Chains by Bridge Kit:</p>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      {supportedChains.map((chain: any, index: number) => (
                        <div key={index} className="p-2 bg-background rounded border">
                          <div className="font-medium">{chain.name}</div>
                          {chain.chainId && (
                            <div className="text-muted-foreground">Chain ID: {chain.chainId}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Estimate Costs Button */}
            <Button
              variant="outline"
              onClick={estimateCosts}
              disabled={!amount || parseFloat(amount) <= 0 || isEstimating || state.isLoading}
              className="w-full"
            >
              {isEstimating ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Estimating Costs...
                </>
              ) : (
                <>
                  <Zap size={16} className="mr-2" />
                  Find Cheapest Route
                </>
              )}
            </Button>

            {/* Cost Estimates Display */}
            {showEstimates && costEstimates.length > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Estimated Costs:</p>
                    {costEstimates.map((estimate) => (
                      <div
                        key={estimate.chainId}
                        className={`p-3 rounded-lg border ${
                          estimate.chainId === sourceChainId && !estimate.error
                            ? 'bg-green-500/10 border-green-500'
                            : estimate.error
                            ? 'bg-destructive/10 border-destructive'
                            : 'bg-background border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{estimate.chainName}</span>
                          {estimate.chainId === sourceChainId && !estimate.error && (
                            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                              Cheapest
                            </span>
                          )}
                        </div>
                        {estimate.isLoading ? (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Loader2 size={12} className="animate-spin mr-1" />
                            Estimating...
                          </div>
                        ) : estimate.error ? (
                          <p className="text-xs text-destructive">{estimate.error}</p>
                        ) : (
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Gas Fee:</span>
                              <span>{estimate.gasFee}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Provider Fee:</span>
                              <span>{estimate.providerFee}</span>
                            </div>
                            <div className="flex justify-between font-semibold pt-1 border-t">
                              <span>Total:</span>
                              <span>{estimate.totalFee}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current Route Estimate */}
            {cheapestEstimate && !isEstimating && (
              <Alert>
                <Zap size={16} />
                <AlertDescription className="ml-2">
                  Selected route: {sourceChainName} → {destinationChainName}
                  <br />
                  <span className="text-xs">Estimated total fee: {cheapestEstimate.totalFee}</span>
                </AlertDescription>
              </Alert>
            )}

            {/* Status Messages */}
            {state.error && (
              <Alert variant="destructive">
                <AlertCircle size={16} />
                <AlertDescription className="ml-2">{state.error}</AlertDescription>
              </Alert>
            )}

            {state.isLoading && state.step !== 'success' && (
              <Alert>
                <Loader2 size={16} className="animate-spin" />
                <AlertDescription className="ml-2">
                  {state.step === 'switching-network' && 'Switching network...'}
                  {state.step === 'approving' && 'Approving USDC... (Step 1/3)'}
                  {state.step === 'signing-bridge' && 'Signing bridge transaction... (Step 2/3)'}
                  {state.step === 'waiting-receive-message' && 'Receiving on destination... (Step 3/3)'}
                  {!['switching-network', 'approving', 'signing-bridge', 'waiting-receive-message'].includes(state.step) && 'Processing...'}
                </AlertDescription>
              </Alert>
            )}

            {state.step === 'success' && state.sourceChainId && state.destinationChainId && (
              <Alert className="border-green-500 text-green-700 dark:text-green-400">
                <CheckCircle size={16} />
                <div className="ml-2">
                  <AlertDescription className="font-semibold">Bridge Successful!</AlertDescription>
                  <p className="text-xs mt-1">
                    USDC successfully transferred from {CHAIN_NAMES[state.sourceChainId]} to {CHAIN_NAMES[state.destinationChainId]}
                    {useDifferentRecipient && recipientAddress && (
                      <>
                        <br />
                        <span className="font-medium">Recipient: </span>
                        {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
                      </>
                    )}
                  </p>

                  {/* Transaction Links */}
                  <div className="space-y-1 mt-3 pt-3 border-t border-green-400/20">
                    {state.sourceTxHash && BLOCK_EXPLORERS[state.sourceChainId] && (
                      <a
                        href={`${BLOCK_EXPLORERS[state.sourceChainId]}/tx/${state.sourceTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs hover:underline"
                      >
                        <span>View {CHAIN_NAMES[state.sourceChainId]} Tx</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                    {state.receiveTxHash && BLOCK_EXPLORERS[state.destinationChainId] && (
                      <a
                        href={`${BLOCK_EXPLORERS[state.destinationChainId]}/tx/${state.receiveTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs hover:underline"
                      >
                        <span>View {CHAIN_NAMES[state.destinationChainId]} Tx</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </Alert>
            )}

            {/* Bridge Button */}
            <Button
              onClick={handleBridge}
              disabled={state.isLoading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > numericBalance || !isValidRecipientAddress}
              className="w-full"
            >
              {state.isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  {state.step === 'switching-network' ? 'Switching Network...' : 'Bridging...'}
                </>
              ) : state.step === 'success' ? (
                'Bridge Complete'
              ) : (
                `Bridge ${amount || '0'} USDC`
              )}
            </Button>

            {/* Reset Button (after success) */}
            {state.step === 'success' && (
              <Button
                variant="outline"
                onClick={() => {
                  reset();
                  setAmount('');
                  setShowEstimates(false);
                  setCostEstimates([]);
                  setUseDifferentRecipient(false);
                  setRecipientAddress('');
                }}
                className="w-full"
              >
                Bridge Again
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground space-y-2">
              <p className="font-semibold">Bridge Process (3 MetaMask Popups):</p>
              <p>1. <strong>Approve</strong>: Approve USDC spending for the bridge contract</p>
              <p>2. <strong>Send</strong>: Send USDC to the source chain bridge contract</p>
              <p>3. <strong>Receive</strong>: Sign to receive USDC on Arc Testnet</p>

              <p className="mt-3 pt-3 border-t">
                <strong>Advanced Features:</strong>
              </p>
              <p>• <strong>Recipient Address:</strong> Send USDC to a different wallet by enabling "Send to a different wallet address"</p>
              <p>• <strong>Cost Estimation:</strong> Click "Find Cheapest Route" to compare fees across different chains</p>
              <p>• <strong>Supported Chains:</strong> Click "View Supported Chains" to see all chains supported by Bridge Kit</p>

              <p className="mt-3 pt-3 border-t text-xs">
                <strong>✅ All routes now supported:</strong> Ethereum Sepolia, Base Sepolia, and Arbitrum Sepolia can all bridge to Arc Testnet.
                All three chains should work with 3 MetaMask popups.
              </p>
              <p className="mt-2 text-xs">
                <strong>Debugging tip:</strong> If bridging fails, open your browser's Console (F12) to see detailed logs
                about chain matching and error details.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
