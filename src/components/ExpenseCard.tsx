import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Users } from "lucide-react";

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  splitBetween: string[];
  date: Date;
}

interface ExpenseCardProps {
  expense: Expense;
  index?: number;
}

export function ExpenseCard({ expense, index = 0 }: ExpenseCardProps) {
  const splitAmount = expense.amount / expense.splitBetween.length;

  return (
    <Card 
      className="shadow-soft hover:shadow-medium transition-all duration-300 animate-fade-in-up group cursor-pointer hover:scale-[1.02] hover:border-primary/20"
      style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "backwards" }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors">
              {expense.description}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Paid by <span className="font-medium text-primary">{expense.paidBy}</span>
            </p>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3 transition-transform group-hover:scale-110" />
              <span>Split between {expense.splitBetween.length} people</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-2xl font-bold text-primary transition-transform group-hover:scale-110">
              <DollarSign className="h-5 w-5" />
              {expense.amount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${splitAmount.toFixed(2)} each
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
