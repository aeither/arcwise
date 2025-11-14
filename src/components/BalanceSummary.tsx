import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

interface Balance {
  from: string;
  to: string;
  amount: number;
}

interface BalanceSummaryProps {
  balances: Balance[];
}

export function BalanceSummary({ balances }: BalanceSummaryProps) {
  if (balances.length === 0) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-xl">Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            All settled up! 🎉
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-xl">Balances</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {balances.map((balance, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="font-medium text-secondary-foreground">{balance.from}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-secondary-foreground">{balance.to}</span>
            </div>
            <div className="text-lg font-bold text-primary">
              ${balance.amount.toFixed(2)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
