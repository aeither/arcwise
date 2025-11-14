import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: string[];
  onAddExpense: (expense: {
    description: string;
    amount: number;
    paidBy: string;
    splitBetween: string[];
  }) => void;
}

export function AddExpenseDialog({ open, onOpenChange, people, onAddExpense }: AddExpenseDialogProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [splitBetween, setSplitBetween] = useState<string[]>(people);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !paidBy || splitBetween.length === 0) return;

    onAddExpense({
      description,
      amount: parseFloat(amount),
      paidBy,
      splitBetween,
    });

    // Reset form
    setDescription("");
    setAmount("");
    setPaidBy("");
    setSplitBetween(people);
    onOpenChange(false);
  };

  // Auto-select all people when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSplitBetween(people);
    }
    onOpenChange(open);
  };

  const togglePerson = (person: string) => {
    setSplitBetween((prev) =>
      prev.includes(person) ? prev.filter((p) => p !== person) : [...prev, person]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md animate-scale-in">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Dinner, groceries, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidBy">Paid by</Label>
            <Select value={paidBy} onValueChange={setPaidBy} required>
              <SelectTrigger id="paidBy">
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent>
                {people.map((person) => (
                  <SelectItem key={person} value={person}>
                    {person}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Split between</Label>
            <div className="space-y-2">
              {people.map((person) => (
                <div key={person} className="flex items-center space-x-2">
                  <Checkbox
                    id={`split-${person}`}
                    checked={splitBetween.includes(person)}
                    onCheckedChange={() => togglePerson(person)}
                  />
                  <label
                    htmlFor={`split-${person}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {person}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full transition-all hover:scale-[1.02]"
            disabled={!description || !amount || !paidBy || splitBetween.length === 0}
          >
            Add Expense
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
