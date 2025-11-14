import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Receipt, History } from "lucide-react";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { ExpenseCard } from "@/components/ExpenseCard";
import { BalanceSummary } from "@/components/BalanceSummary";
import { SettlementHistory, Settlement } from "@/components/SettlementHistory";
import { WalletButton } from "@/components/WalletButton";
import { BridgeButton } from "@/components/BridgeButton";
import { useToast } from "@/hooks/use-toast";

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

// Demo wallet addresses - in production, users would add these themselves
const DEMO_WALLET_ADDRESSES: Record<string, string> = {
  Alice: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  Bob: "0xdD2FD4581271e230360230F9337D5c0430Bf44C0",
  Charlie: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
};

const Index = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const [previousBalanceCount, setPreviousBalanceCount] = useState(0);

  // Keyboard shortcut to open add expense dialog
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setIsDialogOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

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
    
    toast({
      title: "Expense added! 🎉",
      description: `${expenseData.paidBy} paid $${expenseData.amount.toFixed(2)} for ${expenseData.description}`,
      duration: 3000,
    });
  };

  const handleSettle = (from: string, to: string, amount: number, txHash: string, chain: string) => {
    const newSettlement: Settlement = {
      id: Date.now().toString(),
      from,
      to,
      amount,
      txHash,
      chain,
      timestamp: new Date(),
    };
    setSettlements([newSettlement, ...settlements]);
  };

  const balances = calculateBalances();

  // Celebrate when all balances settle
  useEffect(() => {
    if (previousBalanceCount > 0 && balances.length === 0 && expenses.length > 0) {
      toast({
        title: "All settled up! 🎉",
        description: "Everyone's even now. Great job!",
        duration: 4000,
      });
    }
    setPreviousBalanceCount(balances.length);
  }, [balances.length]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                ArcWise
              </h1>
              <p className="text-muted-foreground mt-1">Split expenses with friends, settle with crypto</p>
            </div>
            <div className="flex items-center gap-3">
              <BridgeButton />
              <WalletButton />
              <div className="flex flex-col items-end gap-2">
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  size="lg"
                  className="shadow-medium hover:shadow-soft transition-all hover:scale-105"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Expense
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-semibold">Recent Expenses</h2>
            </div>
            {expenses.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border-2 border-dashed border-border animate-fade-in">
                <Receipt className="h-16 w-16 mx-auto text-muted-foreground mb-4 animate-bounce-subtle" />
                <p className="text-lg font-medium text-foreground mb-1">No expenses yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Start tracking by adding your first expense
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(true)}
                  className="hover:scale-105 transition-transform"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Expense
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense, index) => (
                  <ExpenseCard key={expense.id} expense={expense} index={index} />
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-1 space-y-4">
            <BalanceSummary 
              balances={balances} 
              onSettle={handleSettle}
              walletAddresses={DEMO_WALLET_ADDRESSES}
            />
            {settlements.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <History className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Settlements</h2>
                </div>
                <SettlementHistory settlements={settlements} />
              </div>
            )}
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
