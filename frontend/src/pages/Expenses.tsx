import React, { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, IndianRupee, Tag, Search, Pencil } from "lucide-react";
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
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const EXPENSE_TABS = ["Clinic Expenses", "Personal Daily Expenses", "Others"] as const;
type ExpenseTab = typeof EXPENSE_TABS[number];

const CLINIC_CATEGORIES = [
  "Lab Bill",
  "Rent",
  "Electricity Bill",
  "Maid Salary",
  "Receptionist Salary",
  "Equipment",
  "Medicine Supplies",
  "Other Clinic",
];
const PERSONAL_CATEGORIES = ["Food", "Transport", "Personal Shopping", "Other Personal"];
const OTHER_CATEGORIES = ["Miscellaneous", "One-time", "Other"];

// Map tabs to categories
const TAB_CATEGORIES: Record<ExpenseTab, string[]> = {
  "Clinic Expenses": CLINIC_CATEGORIES,
  "Personal Daily Expenses": PERSONAL_CATEGORIES,
  "Others": OTHER_CATEGORIES,
};

const Expenses: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<ExpenseTab>("Clinic Expenses");

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
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to delete expense"),
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => api.updateExpense(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Expense updated successfully");
      setIsEditOpen(false);
      setEditingExpense(null);
    },
    onError: () => toast.error("Failed to update expense"),
  });

  const filteredExpenses = expenses?.filter((exp: any) => {
    const tabCategories = TAB_CATEGORIES[activeTab];
    const matchesTab = exp.tab === activeTab || (!exp.tab && tabCategories.includes(exp.category));
    const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || exp.category === categoryFilter;
    return matchesTab && matchesSearch && matchesCategory;
  });

  const totalAmount = filteredExpenses?.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0) || 0;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const category = formData.get("category");
    const payload = {
      description: formData.get("description"),
      amount: Number(formData.get("amount")),
      category: category === "auto" ? null : category,
      date: formData.get("date"),
      tab: activeTab,
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
          <h1 className="text-2xl font-heading font-bold">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track and manage your expenditures.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="hidden bg-primary hover:bg-primary/90 md:inline-flex">
              <Plus className="mr-2 h-4 w-4" /> Record Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-[30px] border-white/60 bg-white/95 shadow-[0_20px_60px_rgba(26,18,14,0.16)] backdrop-blur-xl overflow-hidden p-0">
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-secondary/50 via-white to-secondary/30 px-6 py-4">
                <DialogHeader className="space-y-1">
                  <DialogTitle className="font-heading text-xl font-semibold">Record New Expense</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground sr-only">Enter the details of the clinic expenditure.</DialogDescription>
                </DialogHeader>
              </div>
              <div className="grid gap-4 p-6">
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
                    <Input id="amount" name="amount" type="number" autoComplete="off" placeholder="0.00" required />
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
                      {TAB_CATEGORIES[activeTab].map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="bg-secondary/15 px-6 py-4 border-t border-border/60">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={createExpense.isPending} className="rounded-xl shadow-sm shadow-primary/20">
                  {createExpense.isPending ? "Recording..." : "Save Expense"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as ExpenseTab); setCategoryFilter("all"); }}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          {EXPENSE_TABS.map(tab => (
            <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={activeTab} className="space-y-6">

      <div className="grid grid-cols-2 gap-3 md:grid-cols-1 lg:grid-cols-4">
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
        <Card className="md:hidden">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Entries</p>
            <p className="text-2xl font-bold">{filteredExpenses?.length || 0}</p>
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
                  {TAB_CATEGORIES[activeTab].map((cat) => (
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
            <div className="space-y-3 md:hidden">
              {filteredExpenses?.map((exp: any) => (
                <Card key={exp.id} className="border-border/50">
                  <CardContent className="space-y-1 p-3">
                    <p className="font-medium">{exp.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-secondary/60 px-2 py-1 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
                        {exp.category}
                      </span>
                      <p className="font-bold text-destructive">₹{Number(exp.amount).toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(exp.date).toLocaleDateString("en-IN")}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {!isLoading && filteredExpenses?.length !== 0 ? (
            <div className="rounded-xl border border-border/50 overflow-hidden bg-card">
              <div className="hidden overflow-x-auto md:block">
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
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground/50 hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all"
                              onClick={() => {
                                setEditingExpense(exp);
                                setIsEditOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                              onClick={() => setDeleteId(exp.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      </TabsContent>
      </Tabs>

      {/* Edit Expense Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) setEditingExpense(null); }}>
        <DialogContent className="sm:max-w-[425px] rounded-[30px] border-white/60 bg-white/95 shadow-[0_20px_60px_rgba(26,18,14,0.16)] backdrop-blur-xl overflow-hidden p-0">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!editingExpense) return;
            const formData = new FormData(e.currentTarget);
            const payload = {
              description: formData.get("edit-description"),
              amount: Number(formData.get("edit-amount")),
              category: formData.get("edit-category"),
              date: formData.get("edit-date"),
              tab: activeTab,
            };
            updateExpenseMutation.mutate({ id: editingExpense.id, payload });
          }}>
            <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-secondary/50 via-white to-secondary/30 px-6 py-4">
              <DialogHeader className="space-y-1">
                <DialogTitle className="font-heading text-xl font-semibold">Update Expense</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground sr-only">Modify the recorded expense details.</DialogDescription>
              </DialogHeader>
            </div>
            <div className="grid gap-4 p-6">
              <div className="grid gap-2">
                <Label htmlFor="edit-description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expense Name</Label>
                <Input 
                  id="edit-description" 
                  name="edit-description" 
                  defaultValue={editingExpense?.description || ""}
                  required 
                  className="rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-amount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount (₹)</Label>
                  <Input id="edit-amount" name="edit-amount" type="number" autoComplete="off" defaultValue={editingExpense?.amount || ""} required className="rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</Label>
                  <Input id="edit-date" name="edit-date" type="date" defaultValue={editingExpense?.date ? new Date(editingExpense.date).toISOString().split("T")[0] : ""} required className="rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-category" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
                <Select name="edit-category" defaultValue={editingExpense?.category || "Other"}>
                  <SelectTrigger className="rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {TAB_CATEGORIES[activeTab].map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="bg-secondary/15 px-6 py-4 border-t border-border/60">
              <Button variant="outline" type="button" onClick={() => setIsEditOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={updateExpenseMutation.isPending} className="rounded-xl shadow-sm shadow-primary/20">
                {updateExpenseMutation.isPending ? "Updating..." : "Update Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Button size="icon" className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full shadow-lg md:hidden" onClick={() => setIsDialogOpen(true)}>
        <Plus className="h-5 w-5" />
      </Button>

      {/* Delete Expense Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-[30px] border-white/60 bg-white/95 shadow-[0_20px_60px_rgba(26,18,14,0.16)] backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense record? This action cannot be undone and will affect your financial reports.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-border/60 hover:bg-secondary/20 hover:text-foreground transition-colors">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-white shadow-sm shadow-destructive/20"
              onClick={() => {
                if (deleteId) deleteExpense.mutate(deleteId);
              }}
              disabled={deleteExpense.isPending}
            >
              {deleteExpense.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default Expenses;
