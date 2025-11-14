import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, CheckCircle2 } from "lucide-react";

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
        {balances.map((balance, index) => (
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
            <div className="text-lg font-bold text-primary transition-transform group-hover:scale-110">
              ${balance.amount.toFixed(2)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
