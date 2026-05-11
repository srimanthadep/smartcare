import React, { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, IndianRupee, Tag, Filter, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const CATEGORIES = [
  "Rent",
  "Salaries",
  "Medicine Supplies",
  "Equipment",
  "Utility Bills",
  "Marketing",
  "Other",
];

const Expenses: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => api.getExpenses(),
  });

  const createExpense = useMutation({
    mutationFn: (payload: any) => api.createExpense(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Expense recorded successfully");
      setIsDialogOpen(false);
    },
    onError: () => toast.error("Failed to record expense"),
  });

  const deleteExpense = useMutation({
    mutationFn: (id: string) => api.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Expense deleted");
    },
    onError: () => toast.error("Failed to delete expense"),
  });

  const filteredExpenses = expenses?.filter((exp: any) => {
    const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || exp.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalAmount = filteredExpenses?.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0) || 0;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const category = formData.get("category");
    const payload = {
      description: formData.get("description"),
      amount: formData.get("amount"),
      category: category === "auto" ? null : category,
      date: formData.get("date"),
    };
    createExpense.mutate(payload);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Clinic Expenses</h1>
          <p className="text-sm text-muted-foreground">Track and manage your clinic expenditures in one go.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Record Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Record New Expense</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="description">Expense Name</Label>
                  <Input 
                    id="description" 
                    name="description" 
                    placeholder="e.g., Monthly Clinic Rent" 
                    required 
                    onChange={(e) => {
                      const minorWords = ["a", "an", "the", "and", "as", "at", "but", "by", "for", "if", "in", "nor", "of", "on", "or", "so", "to", "up", "yet"];
                      let val = e.target.value;
                      val = val.split(' ').map((word, index) => {
                        if (index > 0 && minorWords.includes(word.toLowerCase())) {
                          return word.toLowerCase();
                        }
                        return word.charAt(0).toUpperCase() + word.slice(1);
                      }).join(' ');
                      e.target.value = val;
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input id="amount" name="amount" type="number" placeholder="0.00" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category <span className="text-muted-foreground text-[10px]">(leave Auto for AI categorization)</span></Label>
                  <Select name="category" defaultValue="auto">
                    <SelectTrigger>
                      <SelectValue placeholder="Auto (AI)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (AI categorization)</SelectItem>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createExpense.isPending}>
                  {createExpense.isPending ? "Recording..." : "Save Expense"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary uppercase tracking-widest">Total Outflow (Filtered)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-1">
              <IndianRupee className="h-6 w-6 text-primary/60" />
              {totalAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses by description..."
                className="pl-9 bg-muted/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredExpenses?.length === 0 ? (
            <div className="py-20 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No expenses found matching your criteria.</p>
              <Button 
                variant="link" 
                onClick={() => { setSearchTerm(""); setCategoryFilter("all"); }}
                className="mt-2 text-primary"
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 border-b border-border/50">
                    <tr>
                      <th className="px-4 py-4 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Date</th>
                      <th className="px-4 py-4 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Expense Name</th>
                      <th className="px-4 py-4 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Category (AI)</th>
                      <th className="px-4 py-4 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Amount</th>
                      <th className="px-4 py-4 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredExpenses.map((exp: any) => (
                      <motion.tr 
                        key={exp.id} 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-muted/20 transition-colors group"
                      >
                        <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">
                          {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-4 font-medium text-foreground">{exp.description}</td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-secondary/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
                            {exp.category}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-destructive">
                          - ₹{Number(exp.amount).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                            onClick={() => {
                              if(window.confirm("Are you sure you want to delete this expense record?")) deleteExpense.mutate(exp.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Expenses;
