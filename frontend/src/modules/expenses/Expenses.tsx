import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Trash2, 
  IndianRupee, 
  Tag, 
  Search, 
  Pencil, 
  TrendingUp, 
  Wallet, 
  ArrowDownRight, 
  Sparkles, 
  AlertCircle, 
  FileText, 
  Calendar, 
  Filter,
  BarChart3,
  Percent,
  CheckCircle,
  Lightbulb,
  ArrowRight,
  PlusCircle
} from "lucide-react";
import { api } from '@/shared/lib/api';
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/shared/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
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

const TAB_CATEGORIES: Record<ExpenseTab, string[]> = {
  "Clinic Expenses": CLINIC_CATEGORIES,
  "Personal Daily Expenses": PERSONAL_CATEGORIES,
  "Others": OTHER_CATEGORIES,
};

// Premium colors for categories to style tags dynamically
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  "Lab Bill": { bg: "bg-blue-500/10", text: "text-blue-500 dark:text-blue-400", border: "border-blue-500/20", glow: "from-blue-500/20 to-indigo-500/20" },
  "Rent": { bg: "bg-purple-500/10", text: "text-purple-500 dark:text-purple-400", border: "border-purple-500/20", glow: "from-purple-500/20 to-pink-500/20" },
  "Electricity Bill": { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20", glow: "from-amber-500/20 to-orange-500/20" },
  "Maid Salary": { bg: "bg-teal-500/10", text: "text-teal-500 dark:text-teal-400", border: "border-teal-500/20", glow: "from-teal-500/20 to-emerald-500/20" },
  "Receptionist Salary": { bg: "bg-indigo-500/10", text: "text-indigo-500 dark:text-indigo-400", border: "border-indigo-500/20", glow: "from-indigo-500/20 to-blue-500/20" },
  "Equipment": { bg: "bg-cyan-500/10", text: "text-cyan-500 dark:text-cyan-400", border: "border-cyan-500/20", glow: "from-cyan-500/20 to-teal-500/20" },
  "Medicine Supplies": { bg: "bg-rose-500/10", text: "text-rose-500 dark:text-rose-400", border: "border-rose-500/20", glow: "from-rose-500/20 to-red-500/20" },
  "Other Clinic": { bg: "bg-slate-500/10", text: "text-slate-500 dark:text-slate-400", border: "border-slate-500/20", glow: "from-slate-500/20 to-zinc-500/20" },
  "Food": { bg: "bg-orange-500/10", text: "text-orange-500 dark:text-orange-400", border: "border-orange-500/20", glow: "from-orange-500/20 to-amber-500/20" },
  "Transport": { bg: "bg-emerald-500/10", text: "text-emerald-500 dark:text-emerald-400", border: "border-emerald-500/20", glow: "from-emerald-500/20 to-teal-500/20" },
  "Personal Shopping": { bg: "bg-pink-500/10", text: "text-pink-500 dark:text-pink-400", border: "border-pink-500/20", glow: "from-pink-500/20 to-rose-500/20" },
  "Other Personal": { bg: "bg-slate-500/10", text: "text-slate-500 dark:text-slate-400", border: "border-slate-500/20", glow: "from-slate-500/20 to-zinc-500/20" },
  "Miscellaneous": { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20", glow: "from-amber-500/20 to-yellow-500/20" },
  "One-time": { bg: "bg-sky-500/10", text: "text-sky-500 dark:text-sky-400", border: "border-sky-500/20", glow: "from-sky-500/20 to-cyan-500/20" },
  "Other": { bg: "bg-slate-500/10", text: "text-slate-500 dark:text-slate-400", border: "border-slate-500/20", glow: "from-slate-500/20 to-zinc-500/20" },
};

// 1-Click Quick Add Templates for empty state filler
const QUICK_TEMPLATES: Record<ExpenseTab, Array<{ description: string; amount: number; category: string }>> = {
  "Clinic Expenses": [
    { description: "Monthly Clinic Rent", amount: 25000, category: "Rent" },
    { description: "Dental Lab Prosthetics Invoice", amount: 8400, category: "Lab Bill" },
    { description: "Monthly Electricity Outflow", amount: 4800, category: "Electricity Bill" },
    { description: "Dental Composite & Consumables Restocking", amount: 12500, category: "Medicine Supplies" },
  ],
  "Personal Daily Expenses": [
    { description: "Clinic Staff Working Lunch", amount: 1200, category: "Food" },
    { description: "Weekly Fuel Outflow", amount: 2500, category: "Transport" },
    { description: "Surgical Scrub Set Purchases", amount: 3500, category: "Personal Shopping" },
    { description: "Clinical Refreshments & Water Refill", amount: 800, category: "Food" },
  ],
  "Others": [
    { description: "Clinic AC Servicing & Clean", amount: 3200, category: "Miscellaneous" },
    { description: "Website Domain Renewal Fee", amount: 1500, category: "One-time" },
    { description: "Dental Association Registration Renewal", amount: 5000, category: "One-time" },
    { description: "Emergency Plumbing Repairs", amount: 1800, category: "Miscellaneous" },
  ],
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

  // Pre-fill helper values for add dialog when using quick templates
  const [dialogPreFill, setDialogPreFill] = useState<{ description: string; amount: string; category: string } | null>(null);

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
      setDialogPreFill(null);
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
  }) || [];

  const totalAmount = filteredExpenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);

  // Advanced Category Share Calculations
  const categorySummary = filteredExpenses.reduce((acc: Record<string, number>, exp: any) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
    return acc;
  }, {});

  const sortedCategories = Object.entries(categorySummary)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const topCategorySpent = sortedCategories[0]?.category || "No Outflows";
  const topCategoryAmount = sortedCategories[0]?.amount || 0;

  // Projection Calculations
  const currentMonthDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const averageDailyOutflow = totalAmount / Math.max(1, currentDay);
  const projectedOutflow = averageDailyOutflow * currentMonthDays;

  // Budget progress status dial
  const budgetLimit = activeTab === "Clinic Expenses" ? 80000 : activeTab === "Personal Daily Expenses" ? 15000 : 10000;
  const budgetPercentage = Math.min(100, (totalAmount / budgetLimit) * 100);

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

  const handleQuickAddClick = (template: { description: string; amount: number; category: string }) => {
    setDialogPreFill({
      description: template.description,
      amount: template.amount.toString(),
      category: template.category,
    });
    setIsDialogOpen(true);
  };

  const getTagColor = (cat: string) => {
    return CATEGORY_COLORS[cat] || { bg: "bg-slate-500/10", text: "text-slate-500", border: "border-slate-500/20", glow: "from-slate-500/10 to-zinc-500/10" };
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-[1400px] mx-auto pb-12"
    >
      {/* Premium Header Panel */}
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-orange-500 bg-orange-500/10 px-2.5 py-0.5 rounded-full">Financial Audit Center</span>
          </div>
          <h1 className="text-3xl font-heading font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent mt-1">
            Expenses Ledger
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Optimize operating margins, view automated AI category allocations, and track clinical cash outflows.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setDialogPreFill(null); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold px-5 py-6 rounded-2xl shadow-[0_4px_20px_rgba(249,115,22,0.25)] hover:shadow-[0_6px_24px_rgba(249,115,22,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2.5">
                <Plus className="h-5 w-5" /> Record Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-[30px] border-white/60 bg-white/95 shadow-[0_20px_60px_rgba(26,18,14,0.16)] backdrop-blur-xl overflow-hidden p-0 dark:bg-slate-900/95 dark:border-slate-800">
              <form onSubmit={handleSubmit}>
                <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-secondary/50 via-white to-secondary/30 dark:from-slate-800/50 dark:to-slate-800/30 px-6 py-4">
                  <DialogHeader className="space-y-1">
                    <DialogTitle className="font-heading text-xl font-bold">Record Expense</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">Log details of your operating expenditure.</DialogDescription>
                  </DialogHeader>
                </div>
                <div className="grid gap-5 p-6">
                  <div className="grid gap-2">
                    <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expense Name</Label>
                    <Input 
                      id="description" 
                      name="description" 
                      placeholder="e.g., Dental Implant Restocking" 
                      defaultValue={dialogPreFill?.description || ""}
                      required 
                      className="rounded-xl border-border/60 bg-muted/40 focus:bg-background focus:ring-1 focus:ring-orange-500/30 transition-all h-11"
                      onChange={(e) => {
                        let val = e.target.value;
                        val = val.charAt(0).toUpperCase() + val.slice(1);
                        e.target.value = val;
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="amount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount (₹)</Label>
                      <Input id="amount" name="amount" type="number" autoComplete="off" placeholder="0.00" defaultValue={dialogPreFill?.amount || ""} required className="rounded-xl border-border/60 bg-muted/40 focus:bg-background focus:ring-1 focus:ring-orange-500/30 transition-all h-11" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</Label>
                      <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required className="rounded-xl border-border/60 bg-muted/40 focus:bg-background focus:ring-1 focus:ring-orange-500/30 transition-all h-11" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category <span className="text-muted-foreground text-[10px] lowercase">(smart audit audit)</span></Label>
                    <Select name="category" key={dialogPreFill?.category || "auto"} defaultValue={dialogPreFill?.category || "auto"}>
                      <SelectTrigger className="rounded-xl border-border/60 bg-muted/40 h-11 focus:bg-background focus:ring-1 focus:ring-orange-500/30 transition-all">
                        <SelectValue placeholder="Auto (Smart AI)" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="auto">Auto (AI Categorization)</SelectItem>
                        {TAB_CATEGORIES[activeTab].map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="bg-secondary/15 px-6 py-4 border-t border-border/60 dark:bg-slate-800/20 flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setDialogPreFill(null); }} className="rounded-xl h-11">Cancel</Button>
                  <Button type="submit" disabled={createExpense.isPending} className="rounded-xl h-11 px-5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold">
                    {createExpense.isPending ? "Recording..." : "Save Transaction"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* High Fidelity Metrics Dashboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Outflow */}
        <Card className="luxury-card border border-border/50 relative overflow-hidden bg-gradient-to-br from-card/85 via-card/70 to-destructive/[0.03] backdrop-blur-md hover:shadow-md transition-all p-5">
          <div className="absolute right-4 top-4 h-11 w-11 rounded-2xl bg-destructive/10 flex items-center justify-center border border-destructive/20 shadow-inner">
            <ArrowDownRight className="h-5.5 w-5.5 text-destructive" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Outflow</span>
            <div className="text-3xl font-extrabold flex items-center tracking-tight text-foreground">
              <IndianRupee className="h-6 w-6 text-muted-foreground/70" />
              {totalAmount.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5 font-medium bg-muted/40 w-fit px-2 py-0.5 rounded-md">
              <TrendingUp className="h-3.5 w-3.5 text-destructive" />
              {filteredExpenses.length} entries registered
            </p>
          </div>
        </Card>

        {/* Card 2: Projected Monthly */}
        <Card className="luxury-card border border-border/50 relative overflow-hidden bg-gradient-to-br from-card/85 via-card/70 to-orange-500/[0.03] backdrop-blur-md hover:shadow-md transition-all p-5">
          <div className="absolute right-4 top-4 h-11 w-11 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-inner">
            <BarChart3 className="h-5.5 w-5.5 text-orange-500" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Projected Monthly</span>
            <div className="text-3xl font-extrabold flex items-center tracking-tight text-foreground">
              <IndianRupee className="h-6 w-6 text-muted-foreground/70" />
              {projectedOutflow.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 font-medium bg-muted/40 w-fit px-2 py-0.5 rounded-md">
              Estimated monthly run rate
            </p>
          </div>
        </Card>

        {/* Card 3: Top Category Spent */}
        <Card className="luxury-card border border-border/50 relative overflow-hidden bg-gradient-to-br from-card/85 via-card/70 to-purple-500/[0.03] backdrop-blur-md hover:shadow-md transition-all p-5">
          <div className="absolute right-4 top-4 h-11 w-11 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-inner">
            <Sparkles className="h-5.5 w-5.5 text-purple-500" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Primary Drain</span>
            <div className="text-2xl font-extrabold tracking-tight text-foreground truncate max-w-[80%] pt-0.5">
              {topCategorySpent}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 font-medium bg-muted/40 w-fit px-2 py-0.5 rounded-md">
              Costing ₹{topCategoryAmount.toLocaleString()} in total
            </p>
          </div>
        </Card>

        {/* Card 4: Daily Burn Rate */}
        <Card className="luxury-card border border-border/50 relative overflow-hidden bg-gradient-to-br from-card/85 via-card/70 to-teal-500/[0.03] backdrop-blur-md hover:shadow-md transition-all p-5">
          <div className="absolute right-4 top-4 h-11 w-11 rounded-2xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20 shadow-inner">
            <Wallet className="h-5.5 w-5.5 text-teal-500" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Daily Burn Rate</span>
            <div className="text-3xl font-extrabold flex items-center tracking-tight text-foreground">
              <IndianRupee className="h-6 w-6 text-muted-foreground/70" />
              {averageDailyOutflow.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 font-medium bg-muted/40 w-fit px-2 py-0.5 rounded-md">
              Daily average cash outflow
            </p>
          </div>
        </Card>
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as ExpenseTab); setCategoryFilter("all"); }} className="w-full space-y-6">
        <TabsList className="flex w-full p-1 rounded-2xl bg-muted/60 backdrop-blur-sm max-w-[540px] border border-border/20 shadow-sm">
          {EXPENSE_TABS.map(tab => (
            <TabsTrigger key={tab} value={tab} className="rounded-xl py-2.5 text-xs font-semibold flex-1 transition-all">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="outline-none">
          {/* Asymmetric 12-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column (8 cols): Transaction Ledger */}
            <div className="lg:col-span-8 space-y-6">
              <Card className="luxury-card bg-card/45 backdrop-blur-md overflow-hidden border border-border/50 shadow-md">
                
                {/* Search & Filter Header */}
                <CardHeader className="pb-5 border-b border-border/40 bg-muted/10 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-muted-foreground/60" />
                      <Input
                        placeholder="Search operating ledger by description..."
                        className="pl-11 h-12 rounded-xl bg-muted/40 focus:bg-background border-border/40 placeholder-muted-foreground/50 transition-all font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-center">
                        <Filter className="h-4.5 w-4.5 text-muted-foreground/80" />
                      </div>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full sm:w-[190px] h-12 rounded-xl border-border/40 bg-muted/40 focus:bg-background transition-all font-semibold text-xs">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="all">All Categories</SelectItem>
                          {TAB_CATEGORIES[activeTab].map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-6 space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                      ))}
                    </div>
                  ) : filteredExpenses.length === 0 ? (
                    /* High-Fidelity Rich Quick-Add Board when empty */
                    <div className="p-8 py-12 text-center space-y-6">
                      <div className="max-w-[360px] mx-auto space-y-3">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-500/10 border border-orange-500/20 shadow-inner mb-2 animate-bounce">
                          <Lightbulb className="h-8 w-8 text-orange-500" />
                        </div>
                        <h3 className="text-lg font-bold tracking-tight">Financial Ledger is Empty</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          You haven't recorded any expenditures under <strong className="text-foreground">{activeTab}</strong>. Populate your ledger instantly using our AI templates below:
                        </p>
                      </div>

                      {/* 1-Click Quick Add Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[620px] mx-auto mt-4 text-left">
                        {QUICK_TEMPLATES[activeTab].map((template, idx) => (
                          <motion.div
                            key={idx}
                            whileHover={{ y: -3, scale: 1.01 }}
                            className="p-4 rounded-2xl border border-border/50 bg-card hover:bg-muted/10 transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
                            onClick={() => handleQuickAddClick(template)}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase border ${getTagColor(template.category).bg} ${getTagColor(template.category).text} ${getTagColor(template.category).border}`}>
                                  {template.category}
                                </span>
                                <PlusCircle className="h-4.5 w-4.5 text-muted-foreground/40 group-hover:text-orange-500 transition-colors" />
                              </div>
                              <p className="font-bold text-xs pt-2 text-foreground leading-snug line-clamp-1">{template.description}</p>
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
                              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">Quick Add Template</span>
                              <span className="text-xs font-black text-foreground">₹{template.amount.toLocaleString()}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Mobile Adaptive Scroll Lists */}
                      <div className="md:hidden divide-y divide-border/40">
                        {filteredExpenses.map((exp: any) => (
                          <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                            <div className="space-y-1.5 pr-4 flex-1">
                              <p className="font-bold text-sm text-foreground line-clamp-1">{exp.description}</p>
                              <div className="flex items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase border ${getTagColor(exp.category).bg} ${getTagColor(exp.category).text} ${getTagColor(exp.category).border}`}>
                                  {exp.category}
                                </span>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(exp.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-destructive text-sm pr-1">-₹{Number(exp.amount).toLocaleString()}</p>
                              <div className="flex items-center gap-0.5">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-muted-foreground/60 hover:text-primary rounded-lg"
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
                                  className="h-8 w-8 text-muted-foreground/60 hover:text-destructive rounded-lg"
                                  onClick={() => setDeleteId(exp.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Ledger Table */}
                      <div className="hidden md:block overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/30 border-b border-border/50">
                            <tr>
                              <th className="px-5 py-4.5 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px] w-[18%]">Date</th>
                              <th className="px-5 py-4.5 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px] w-[44%]">Description</th>
                              <th className="px-5 py-4.5 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px] w-[20%]">Category</th>
                              <th className="px-5 py-4.5 text-right font-bold text-muted-foreground uppercase tracking-wider text-[10px] w-[13%]">Outflow</th>
                              <th className="px-5 py-4.5 text-right font-bold text-muted-foreground uppercase tracking-wider text-[10px] w-[5%]">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            <AnimatePresence initial={false}>
                              {filteredExpenses.map((exp: any) => (
                                <motion.tr 
                                  key={exp.id} 
                                  layout
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="hover:bg-muted/15 transition-colors group cursor-default"
                                >
                                  <td className="px-5 py-4.5 text-muted-foreground text-xs whitespace-nowrap">
                                    <div className="flex items-center gap-2 font-medium">
                                      <Calendar className="h-4 w-4 text-muted-foreground/40" />
                                      {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                  </td>
                                  <td className="px-5 py-4.5 font-bold text-foreground">{exp.description}</td>
                                  <td className="px-5 py-4.5">
                                    <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase border ${getTagColor(exp.category).bg} ${getTagColor(exp.category).text} ${getTagColor(exp.category).border}`}>
                                      {exp.category}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4.5 text-right font-black text-destructive text-[13px] whitespace-nowrap">
                                    - ₹{Number(exp.amount).toLocaleString('en-IN')}
                                  </td>
                                  <td className="px-5 py-4.5 text-right">
                                    <div className="flex items-center justify-end gap-0.5">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-muted-foreground/45 hover:text-primary hover:bg-primary/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
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
                                        className="h-8 w-8 text-muted-foreground/45 hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                                        onClick={() => setDeleteId(exp.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </motion.tr>
                              ))}
                            </AnimatePresence>
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column (4 cols): Budget Dials & Distribution Analysis */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Card 1: Budget Target Progress visual dial */}
              <Card className="luxury-card bg-card/45 backdrop-blur-md border border-border/50 shadow-md">
                <CardHeader className="pb-3">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Monthly Limit Budget</span>
                  <CardTitle className="text-base font-extrabold tracking-tight mt-1 flex items-center justify-between">
                    Budget Allocation Progress
                    <span className="text-[11px] bg-secondary border border-border/30 px-2 py-0.5 rounded text-muted-foreground font-black">
                      ₹{budgetLimit.toLocaleString()} Cap
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 flex flex-col items-center justify-center py-6">
                  {/* Visual Radial Budget Ring */}
                  <div className="relative h-32 w-32 flex items-center justify-center">
                    <svg className="absolute transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="currentColor" className="text-secondary/50" strokeWidth="8" />
                      <motion.circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        fill="transparent" 
                        stroke="currentColor" 
                        className={budgetPercentage >= 90 ? "text-destructive" : budgetPercentage >= 65 ? "text-orange-500" : "text-primary"}
                        strokeWidth="8" 
                        strokeDasharray="251.2"
                        strokeLinecap="round"
                        initial={{ strokeDashoffset: 251.2 }}
                        animate={{ strokeDashoffset: 251.2 - (251.2 * budgetPercentage) / 100 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="text-center space-y-0.5">
                      <span className="text-2xl font-black">{budgetPercentage.toFixed(0)}%</span>
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">utilized</p>
                    </div>
                  </div>

                  <div className="w-full text-center space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Current tab outlay is <strong className="text-foreground">₹{totalAmount.toLocaleString()}</strong>.
                    </p>
                    <span className="text-[10px] font-semibold text-muted-foreground flex items-center justify-center gap-1">
                      {budgetPercentage >= 90 ? (
                        <span className="text-destructive font-bold flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Budget almost exhausted!</span>
                      ) : (
                        <span className="text-primary font-bold flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Safe financial budget thresholds</span>
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Outflow breakdown lists */}
              <Card className="luxury-card bg-card/45 backdrop-blur-md border border-border/50 shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-orange-500" />
                    <CardTitle className="text-sm font-extrabold tracking-tight">Ledger Allocation</CardTitle>
                  </div>
                  <CardDescription className="text-xs">Visual category percentage breakdowns.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sortedCategories.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                      <div className="h-10 w-10 rounded-xl bg-muted/40 flex items-center justify-center border border-border/30">
                        <AlertCircle className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                      No transaction summaries mapped yet.
                    </div>
                  ) : (
                    sortedCategories.map(({ category, amount }) => {
                      const share = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
                      const config = getTagColor(category);
                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="flex items-center gap-2">
                              <span className={`h-3 w-3 rounded-md border ${config.bg} ${config.border}`}></span>
                              {category}
                            </span>
                            <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                              ₹{amount.toLocaleString()} 
                              <span className="text-[9px] bg-secondary border border-border/30 text-muted-foreground font-black px-1.5 py-0.5 rounded">
                                {share.toFixed(0)}%
                              </span>
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-secondary/35 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${share}%` }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                              className={`h-full bg-gradient-to-r ${config.glow} rounded-full`}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Card 3: Clinic Financial Tip */}
              <Card className="border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.04] via-orange-500/[0.01] to-transparent relative overflow-hidden rounded-3xl p-5 space-y-3">
                <div className="h-9 w-9 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                  <Sparkles className="h-4.5 w-4.5 text-orange-500 animate-pulse" />
                </div>
                <h4 className="text-sm font-bold tracking-tight">AI Cashflow Insight</h4>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  {totalAmount === 0 ? (
                    "Populate your financial ledger by choosing one of our instant quick add templates! This allows the system to establish standard budget targets and generate cash flow recommendations."
                  ) : (
                    <>
                      Your primary cash drain is currently <strong className="text-foreground">{topCategorySpent}</strong> ({((topCategoryAmount / totalAmount) * 100).toFixed(0)}%). 
                      Verify vendor agreements and dental lab supply invoices to optimize operating profit margins.
                    </>
                  )}
                </p>
              </Card>
            </div>

          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Expense Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) setEditingExpense(null); }}>
        <DialogContent className="sm:max-w-[425px] rounded-[30px] border-white/60 bg-white/95 shadow-[0_20px_60px_rgba(26,18,14,0.16)] backdrop-blur-xl overflow-hidden p-0 dark:bg-slate-900/95 dark:border-slate-800">
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
            <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-secondary/50 via-white to-secondary/30 dark:from-slate-800/50 dark:to-slate-800/30 px-6 py-4">
              <DialogHeader className="space-y-1">
                <DialogTitle className="font-heading text-xl font-bold">Update Expense</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">Modify recorded transaction values.</DialogDescription>
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
                  className="rounded-xl border-border/60 bg-muted/40 focus:bg-background transition-all h-11"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-amount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount (₹)</Label>
                  <Input id="edit-amount" name="edit-amount" type="number" autoComplete="off" defaultValue={editingExpense?.amount || ""} required className="rounded-xl border-border/60 bg-muted/40 focus:bg-background transition-all h-11" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</Label>
                  <Input id="edit-date" name="edit-date" type="date" defaultValue={editingExpense?.date ? new Date(editingExpense.date).toISOString().split("T")[0] : ""} required className="rounded-xl border-border/60 bg-muted/40 focus:bg-background transition-all h-11" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-category" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
                <Select name="edit-category" defaultValue={editingExpense?.category || "Other"}>
                  <SelectTrigger className="rounded-xl border-border/60 bg-muted/40 h-11 focus:bg-background transition-all">
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
            <DialogFooter className="bg-secondary/15 px-6 py-4 border-t border-border/60 dark:bg-slate-800/20 flex items-center justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setIsEditOpen(false)} className="rounded-xl h-11">Cancel</Button>
              <Button type="submit" disabled={updateExpenseMutation.isPending} className="rounded-xl h-11 px-5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold">
                {updateExpenseMutation.isPending ? "Updating..." : "Update Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Floating Action Trigger on Mobile */}
      <Button size="icon" className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full shadow-lg md:hidden" onClick={() => setIsDialogOpen(true)}>
        <Plus className="h-5 w-5" />
      </Button>

      {/* Delete Expense Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-[30px] border-white/60 bg-white/95 shadow-[0_20px_60px_rgba(26,18,14,0.16)] backdrop-blur-xl dark:bg-slate-900/95 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense record? This action cannot be undone and will affect your financial reports.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-border/60 hover:bg-secondary/20 hover:text-foreground transition-all">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-white shadow-md shadow-destructive/10 animate-pulse"
              onClick={() => {
                if (deleteId) deleteExpense.mutate(deleteId);
              }}
              disabled={deleteExpense.isPending}
            >
              {deleteExpense.isPending ? "Deleting..." : "Delete Transaction"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default Expenses;
