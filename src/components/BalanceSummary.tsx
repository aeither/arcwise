import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { useToast } from "@/hooks/use-toast";

interface Balance {
  from: string;
  to: string;
  amount: number;
}

interface BalanceSummaryProps {
  balances: Balance[];
  onSettle: (from: string, to: string, amount: number, txHash: string, chain: string) => void;
  walletAddresses: Record<string, string>;
}

export function BalanceSummary({ balances, onSettle, walletAddresses }: BalanceSummaryProps) {
  const { address, chain } = useAccount();
  const { toast } = useToast();
  const [pendingSettlement, setPendingSettlement] = useState<string | null>(null);
  const { data: hash, sendTransaction } = useSendTransaction();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Handle successful transaction
  if (isSuccess && hash && pendingSettlement) {
    const [from, to, amount] = pendingSettlement.split('|');
    onSettle(from, to, parseFloat(amount), hash, chain?.name || 'Unknown');
    setPendingSettlement(null);
    
    toast({
      title: "Payment successful! 🎉",
      description: `${from} paid ${to} $${parseFloat(amount).toFixed(2)}`,
      duration: 4000,
    });
  }

  const handleSettleUp = (balance: Balance) => {
    if (!address) {
      toast({
        title: "Connect wallet first",
        description: "Please connect your wallet to settle payments",
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

    setPendingSettlement(`${balance.from}|${balance.to}|${balance.amount}`);
    
    sendTransaction({
      to: recipientAddress as `0x${string}`,
      value: parseEther(balance.amount.toString()),
    });

    toast({
      title: "Transaction sent",
      description: "Waiting for confirmation...",
    });
  };
  if (balances.length === 0) {
    return (
      <Card className="shadow-soft border-success/20 bg-success/5 animate-scale-in">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success animate-bounce-subtle" />
            Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="text-4xl mb-2 animate-bounce-subtle">🎉</div>
            <p className="text-success font-semibold">All settled up!</p>
            <p className="text-sm text-muted-foreground mt-1">Everyone's even</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft sticky top-4">
      <CardHeader>
        <CardTitle className="text-xl">Balances</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {balances.map((balance, index) => {
          const isPending = isConfirming && pendingSettlement === `${balance.from}|${balance.to}|${balance.amount}`;
          
          return (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-all duration-300 animate-fade-in group"
              style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "backwards" }}
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="font-medium text-secondary-foreground">{balance.from}</span>
                <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
                <span className="font-medium text-secondary-foreground">{balance.to}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-lg font-bold text-primary transition-transform group-hover:scale-110">
                  ${balance.amount.toFixed(2)}
                </div>
                <Button
                  onClick={() => handleSettleUp(balance)}
                  disabled={isPending || !address}
                  size="sm"
                  className="animate-fade-in transition-all hover:scale-105"
                >
                  <Wallet className="h-4 w-4 mr-1" />
                  {isPending ? "Confirming..." : "Settle Up"}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
