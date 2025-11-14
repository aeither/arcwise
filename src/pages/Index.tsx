import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Receipt } from "lucide-react";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { ExpenseCard } from "@/components/ExpenseCard";
import { BalanceSummary } from "@/components/BalanceSummary";

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  splitBetween: string[];
  date: Date;
}

interface Balance {
  from: string;
  to: string;
  amount: number;
}

const INITIAL_PEOPLE = ["Alice", "Bob", "Charlie"];

const Index = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const calculateBalances = (): Balance[] => {
    const balances: Record<string, number> = {};
    
    INITIAL_PEOPLE.forEach((person) => {
      balances[person] = 0;
    });

    expenses.forEach((expense) => {
      const shareAmount = expense.amount / expense.splitBetween.length;
      
      balances[expense.paidBy] += expense.amount;
      
      expense.splitBetween.forEach((person) => {
        balances[person] -= shareAmount;
      });
    });

    const debts: Balance[] = [];
    const creditors = Object.entries(balances)
      .filter(([_, amount]) => amount > 0.01)
      .sort((a, b) => b[1] - a[1]);
    const debtors = Object.entries(balances)
      .filter(([_, amount]) => amount < -0.01)
      .sort((a, b) => a[1] - b[1]);

    let i = 0;
    let j = 0;

    while (i < creditors.length && j < debtors.length) {
      const [creditor, creditAmount] = creditors[i];
      const [debtor, debtAmount] = debtors[j];

      const settleAmount = Math.min(creditAmount, Math.abs(debtAmount));

      debts.push({
        from: debtor,
        to: creditor,
        amount: settleAmount,
      });

      creditors[i][1] -= settleAmount;
      debtors[j][1] += settleAmount;

      if (creditors[i][1] < 0.01) i++;
      if (Math.abs(debtors[j][1]) < 0.01) j++;
    }

    return debts;
  };

  const handleAddExpense = (expenseData: Omit<Expense, "id" | "date">) => {
    const newExpense: Expense = {
      ...expenseData,
      id: Date.now().toString(),
      date: new Date(),
    };
    setExpenses([newExpense, ...expenses]);
  };

  const balances = calculateBalances();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                SplitSimple
              </h1>
              <p className="text-muted-foreground mt-1">Split expenses with friends, easily</p>
            </div>
            <Button
              onClick={() => setIsDialogOpen(true)}
              size="lg"
              className="shadow-medium hover:shadow-soft transition-all"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Expense
            </Button>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-semibold">Recent Expenses</h2>
            </div>
            {expenses.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed border-border">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No expenses yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add your first expense to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <ExpenseCard key={expense.id} expense={expense} />
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-1">
            <BalanceSummary balances={balances} />
          </div>
        </div>
      </div>

      <AddExpenseDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        people={INITIAL_PEOPLE}
        onAddExpense={handleAddExpense}
      />
    </div>
  );
};

export default Index;
