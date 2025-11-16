import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Wallet, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCircleSmartAccount } from "@/hooks/useCircleSmartAccount";

interface Balance {
  from: string;
  to: string;
  amount: number;
}

interface BalanceSummaryProps {
  balances: Balance[];
  onSettle: (from: string, to: string, amount: number, txHash: string, chain: string) => void;
  walletAddresses: Record<string, string>;
  chainId?: number;
}

export function BalanceSummary({ balances, onSettle, walletAddresses, chainId = 84532 }: BalanceSummaryProps) {
  const { account, credential, sendUSDC, isLoading, txHash, currentChainName } = useCircleSmartAccount(chainId);
  const { toast } = useToast();
  const [pendingSettlement, setPendingSettlement] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  // Handle successful transaction
  useEffect(() => {
    if (txHash && txHash !== lastTxHash && pendingSettlement) {
      const [from, to, amount] = pendingSettlement.split('|');
      onSettle(from, to, parseFloat(amount), txHash, currentChainName);
      setPendingSettlement(null);
      setLastTxHash(txHash);

      toast({
        title: "Payment successful! 🎉",
        description: `${from} paid ${to} $${parseFloat(amount).toFixed(2)} USDC`,
        duration: 4000,
      });
    }
  }, [txHash, lastTxHash, pendingSettlement, onSettle, toast, currentChainName]);

  const handleSettleUp = async (balance: Balance) => {
    if (!credential || !account) {
      toast({
        title: "Sign in required",
        description: "Please sign in to settle payments",
        variant: "destructive",
      });
      return;
    }

    const recipientAddress = walletAddresses[balance.to];
    if (!recipientAddress) {
      toast({
        title: "Recipient address not found",
        description: `${balance.to} hasn't connected their wallet yet`,
        variant: "destructive",
      });
      return;
    }

    try {
      setPendingSettlement(`${balance.from}|${balance.to}|${balance.amount}`);

      toast({
        title: "Sending payment...",
        description: "Processing - no fees!",
      });

      await sendUSDC(recipientAddress as `0x${string}`, balance.amount.toString());
    } catch (error) {
      setPendingSettlement(null);
      toast({
        title: "Transaction failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };
  if (balances.length === 0) {
    return (
      <Card className="shadow-soft border-success/20 bg-success/5 animate-scale-in">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg lg:text-xl flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success animate-bounce-subtle" />
            Balances
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-center py-4 sm:py-6">
            <div className="text-3xl sm:text-4xl mb-2 animate-bounce-subtle">🎉</div>
            <p className="text-success font-semibold text-sm sm:text-base">All settled up!</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Everyone's even</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft lg:sticky lg:top-4">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg lg:text-xl">Balances</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-6 pt-0">
        {balances.map((balance, index) => {
          const isPending = isLoading && pendingSettlement === `${balance.from}|${balance.to}|${balance.amount}`;

          return (
            <div
              key={index}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-all duration-300 animate-fade-in group gap-2 sm:gap-3"
              style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "backwards" }}
            >
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <span className="font-medium text-xs sm:text-sm text-secondary-foreground truncate">{balance.from}</span>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary transition-transform group-hover:translate-x-1 shrink-0" />
                <span className="font-medium text-xs sm:text-sm text-secondary-foreground truncate">{balance.to}</span>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                <div className="text-base sm:text-lg font-bold text-primary transition-transform group-hover:scale-110">
                  ${balance.amount.toFixed(2)}
                </div>
                <Button
                  onClick={() => handleSettleUp(balance)}
                  disabled={isPending || !account}
                  size="sm"
                  className="animate-fade-in transition-all hover:scale-105 text-xs shrink-0"
                >
                  {isPending ? (
                    <>
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 animate-spin" />
                      <span className="hidden xs:inline">Sending...</span>
                      <span className="xs:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden xs:inline">Settle Up</span>
                      <span className="xs:hidden">Pay</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
