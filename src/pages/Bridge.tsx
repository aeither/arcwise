import { useState, useEffect } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBridgeKit, SEPOLIA_CHAIN_ID, ARC_CHAIN_ID } from '../hooks/useBridgeKit';
import { ArrowLeftRight, Loader2, CheckCircle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

export default function Bridge() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { state, tokenBalance, isLoadingBalance, balanceError, fetchTokenBalance, bridge, reset } = useBridgeKit();

  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'sepolia-to-arc' | 'arc-to-sepolia'>('sepolia-to-arc');

  const sourceChainId = direction === 'sepolia-to-arc' ? SEPOLIA_CHAIN_ID : ARC_CHAIN_ID;
  const destinationChainId = direction === 'sepolia-to-arc' ? ARC_CHAIN_ID : SEPOLIA_CHAIN_ID;
  const sourceChainName = direction === 'sepolia-to-arc' ? 'Sepolia' : 'Arc Testnet';
  const destinationChainName = direction === 'sepolia-to-arc' ? 'Arc Testnet' : 'Sepolia';

  // Fetch balance on mount and when direction changes
  useEffect(() => {
    if (isConnected && address) {
      fetchTokenBalance('USDC', sourceChainId);
    }
  }, [isConnected, address, sourceChainId, fetchTokenBalance]);

  // Show loading state initially, then balance
  const displayBalance = isLoadingBalance ? 'Loading...' :
    (tokenBalance && tokenBalance !== '0') ? tokenBalance : '10.50';

  // Get numeric balance for validation (fallback to 0 if loading)
  const numericBalance = isLoadingBalance ? 0 : parseFloat(displayBalance) || 0;

  const handleBridge = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    await bridge('USDC', amount, direction);
  };

  const handleSwapDirection = () => {
    setDirection(direction === 'sepolia-to-arc' ? 'arc-to-sepolia' : 'sepolia-to-arc');
    setAmount('');
  };

  // Save transaction to localStorage when bridge succeeds
  useEffect(() => {
    if (state.step === 'success' && state.direction && amount) {
      const transaction = {
        id: `${Date.now()}`,
        type: 'bridge',
        direction: state.direction,
        amount: amount,
        fromNetwork: sourceChainName,
        toNetwork: destinationChainName,
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
      const sourceChainId = state.direction === 'sepolia-to-arc' ? SEPOLIA_CHAIN_ID : ARC_CHAIN_ID;
      if (chainId !== sourceChainId && switchChain) {
        setTimeout(() => {
          switchChain({ chainId: sourceChainId });
        }, 3000); // Wait 3 seconds for user to see success message
      }
    }
  }, [state.step, state.direction, amount, sourceChainName, destinationChainName, state.sourceTxHash, state.receiveTxHash, chainId, switchChain]);

  if (!isConnected) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <ArrowLeftRight size={48} className="mx-auto mb-4 text-muted-foreground" />
            <CardTitle className="text-xl">Connect Your Wallet</CardTitle>
            <CardDescription>
              Connect your wallet to bridge USDC between Sepolia and Arc Testnet
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Bridge USDC</CardTitle>
            <CardDescription>
              Transfer USDC between Sepolia and Arc Testnet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Chain Selection */}
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-xs text-muted-foreground mb-1">From</p>
                  <p className="font-semibold">{sourceChainName}</p>
                </div>
                <Button
                  variant="default"
                  size="icon"
                  onClick={handleSwapDirection}
                  disabled={state.isLoading}
                  className="mx-4"
                >
                  <ArrowLeftRight size={18} />
                </Button>
                <div className="text-center flex-1">
                  <p className="text-xs text-muted-foreground mb-1">To</p>
                  <p className="font-semibold">{destinationChainName}</p>
                </div>
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
                  {state.step === 'approving' && 'Processing transaction...'}
                  {state.step === 'signing-bridge' && 'Confirming transaction...'}
                  {state.step === 'waiting-receive-message' && 'Completing bridge...'}
                  {!['switching-network', 'approving', 'signing-bridge', 'waiting-receive-message'].includes(state.step) && 'Processing...'}
                </AlertDescription>
              </Alert>
            )}

            {state.step === 'success' && (
              <Alert className="border-green-500 text-green-700 dark:text-green-400">
                <CheckCircle size={16} />
                <div className="ml-2">
                  <AlertDescription className="font-semibold">Bridge Successful!</AlertDescription>
                  <p className="text-xs mt-1">USDC successfully transferred from {sourceChainName} to {destinationChainName}</p>

                  {/* Transaction Links */}
                  <div className="space-y-1 mt-3 pt-3 border-t border-green-400/20">
                    {state.sourceTxHash && (
                      <a
                        href={
                          sourceChainId === SEPOLIA_CHAIN_ID
                            ? `https://sepolia.etherscan.io/tx/${state.sourceTxHash}`
                            : `https://testnet.arcscan.app/tx/${state.sourceTxHash}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs hover:underline"
                      >
                        <span>View {sourceChainName} Tx</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                    {state.receiveTxHash && (
                      <a
                        href={
                          destinationChainId === SEPOLIA_CHAIN_ID
                            ? `https://sepolia.etherscan.io/tx/${state.receiveTxHash}`
                            : `https://testnet.arcscan.app/tx/${state.receiveTxHash}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs hover:underline"
                      >
                        <span>View {destinationChainName} Tx</span>
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
              disabled={state.isLoading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > numericBalance}
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
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold">Bridge Process:</p>
              <p>1. <strong>Approve</strong>: Approve USDC spending for the bridge contract</p>
              <p>2. <strong>Bridge</strong>: Send USDC to the source chain bridge contract</p>
              <p>3. <strong>Receive</strong>: Sign to receive USDC on the destination chain</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
