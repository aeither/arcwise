import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Settlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  txHash: string;
  timestamp: Date;
  chain: string;
}

interface SettlementHistoryProps {
  settlements: Settlement[];
}

export function SettlementHistory({ settlements }: SettlementHistoryProps) {
  if (settlements.length === 0) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-xl">Settlement History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">No settlements yet</p>
            <p className="text-xs mt-1">Payments will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-xl">Settlement History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {settlements.map((settlement, index) => (
          <div
            key={settlement.id}
            className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20 animate-fade-in group"
            style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "backwards" }}
          >
            <div className="flex items-center gap-3 flex-1">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {settlement.from} → {settlement.to}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {settlement.chain}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {settlement.timestamp.toLocaleDateString()} at{" "}
                  {settlement.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-success">
                ${settlement.amount.toFixed(2)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const explorerUrl = settlement.chain.includes('Sepolia') 
                    ? `https://sepolia.etherscan.io/tx/${settlement.txHash}`
                    : settlement.chain.includes('Base')
                    ? `https://basescan.org/tx/${settlement.txHash}`
                    : `https://etherscan.io/tx/${settlement.txHash}`;
                  window.open(explorerUrl, '_blank');
                }}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
