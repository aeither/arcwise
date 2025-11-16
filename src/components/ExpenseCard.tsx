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
      className="shadow-soft hover:shadow-medium transition-all duration-300 animate-fade-in-up group cursor-pointer hover:scale-[1.01] sm:hover:scale-[1.02] hover:border-primary/20"
      style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "backwards" }}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base text-card-foreground group-hover:text-primary transition-colors truncate">
              {expense.description}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Paid by <span className="font-medium text-primary">{expense.paidBy}</span>
            </p>
            <div className="flex items-center gap-1 mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground">
              <Users className="h-3 w-3 transition-transform group-hover:scale-110 shrink-0" />
              <span>Split {expense.splitBetween.length} ways</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-0.5 sm:gap-1 text-xl sm:text-2xl font-bold text-primary transition-transform group-hover:scale-110">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>{expense.amount.toFixed(2)}</span>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
              ${splitAmount.toFixed(2)} each
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
