import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { BalanceSummary } from "@/components/BalanceSummary";
import { ExpenseCard } from "@/components/ExpenseCard";
import { Header } from "@/components/Header";
import { Settlement, SettlementHistory } from "@/components/SettlementHistory";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { History, Plus, Receipt, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

const INITIAL_PEOPLE = ["Olivia", "Juan", "Lucas"];

// Demo wallet addresses - in production, users would add these themselves
const DEMO_WALLET_ADDRESSES: Record<string, string> = {
  Olivia: "0x742D35CC6634c0532925A3b844BC9E7595F0BEb0",
  Juan: "0xdD2FD4581271e230360230F9337D5c0430Bf44C0",
  Lucas: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
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
      <Header />

      <div className="container max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        {/* Welcome Banner - Web2 Style */}
        <Alert className="mb-4 sm:mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1 text-sm sm:text-base">👋 Welcome to ArcWise</p>
              <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                Split expenses instantly with friends. Settle up with one tap - no gas fees!
              </p>
              <p className="text-[10px] sm:text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                ✨ Powered by Circle Smart Wallet, BridgeKit, Gateway & Arc Testnet
              </p>
            </div>
            <Button
              onClick={() => window.open('https://faucet.circle.com', '_blank')}
              variant="outline"
              size="sm"
              className="border-blue-300 hover:bg-blue-100 dark:border-blue-700 dark:hover:bg-blue-900 w-full sm:w-auto shrink-0 text-xs sm:text-sm"
            >
              Get Test Money
              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
            </Button>
          </AlertDescription>
        </Alert>

        {/* Mobile-optimized layout */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_380px] mb-8">
          {/* Main Content Area */}
          <div className="space-y-4 order-2 lg:order-1">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold">Recent Expenses</h2>
              </div>
              {expenses.length > 0 && (
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Empty State */}
            {expenses.length === 0 ? (
              <div className="text-center py-12 sm:py-16 bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg sm:rounded-xl border-2 border-dashed border-border animate-fade-in">
                <Receipt className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-3 sm:mb-4 animate-bounce-subtle" />
                <p className="text-base sm:text-lg font-medium text-foreground mb-1">No expenses yet</p>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 px-4">
                  Start tracking by adding your first expense
                </p>
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  className="hover:scale-105 transition-transform"
                  size="default"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Expense
                </Button>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {expenses.map((expense, index) => (
                  <ExpenseCard key={expense.id} expense={expense} index={index} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar - Balances & Settlements */}
          <div className="space-y-4 order-1 lg:order-2">
            {/* Balances Section */}
            <div>
              <BalanceSummary 
                balances={balances} 
                onSettle={handleSettle}
                walletAddresses={DEMO_WALLET_ADDRESSES}
              />
            </div>

            {/* Settlements History */}
            {settlements.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <History className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <h2 className="text-base sm:text-lg lg:text-xl font-semibold">Settlements</h2>
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
