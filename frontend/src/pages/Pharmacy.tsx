import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IndianRupee,
  Package2,
  Pill,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { mockInventory } from "@/data/mockData";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LocalInventoryItem = {
  id: string;
  name: string;
  strength: string;
  form: string;
  stock: number;
  minStock: number;
  expiry: string;
  supplier: string;
};

const INVENTORY_KEY = "siara-local-inventory";

function loadInventory(): LocalInventoryItem[] {
  try {
    const stored = localStorage.getItem(INVENTORY_KEY);
    return stored ? JSON.parse(stored) : (mockInventory as LocalInventoryItem[]);
  } catch {
    return mockInventory as LocalInventoryItem[];
  }
}

const Pharmacy: React.FC = () => {
  const queryClient = useQueryClient();

  const [inventory, setInventory] = useState<LocalInventoryItem[]>(loadInventory);
  const [medicineQuery, setMedicineQuery] = useState("");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [procedureDialogOpen, setProcedureDialogOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<any | null>(null);
  const [procedureForm, setProcedureForm] = useState({ name: "", price: "" });

  const debouncedMedicine = useDebounce(medicineQuery, 250);

  useEffect(() => {
    document.title = "Pharmacy · Siara Dental";
  }, []);

  useEffect(() => {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
  }, [inventory]);

  const proceduresQuery = useQuery({
    queryKey: ["procedures"],
    queryFn: api.getProcedures,
  });

  const medicineSearchQuery = useQuery({
    queryKey: ["medicines", "search", debouncedMedicine],
    queryFn: async () => {
      if (!debouncedMedicine.trim() || debouncedMedicine.trim().length < 2) return [];
      const res = await api.searchMedicines(debouncedMedicine);
      return res ?? [];
    },
    enabled: true,
  });

  const createProcedure = useMutation({
    mutationFn: (payload: { name: string; price: number }) => api.createProcedure(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedures"] });
      toast.success("Procedure created");
      setProcedureDialogOpen(false);
      setProcedureForm({ name: "", price: "" });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Unable to create procedure"),
  });

  const updateProcedure = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      api.updateProcedure(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedures"] });
      toast.success("Procedure updated");
      setProcedureDialogOpen(false);
      setEditingProcedure(null);
      setProcedureForm({ name: "", price: "" });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Unable to update procedure"),
  });

  const deleteProcedure = useMutation({
    mutationFn: (id: string) => api.deleteProcedure(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedures"] });
      toast.success("Procedure deleted");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Unable to delete procedure"),
  });

  const procedures = (proceduresQuery.data ?? []) as any[];
  const medicineResults = (medicineSearchQuery.data ?? []) as any[];

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) =>
      [item.name, item.strength, item.form, item.supplier]
        .join(" ")
        .toLowerCase()
        .includes(inventoryQuery.toLowerCase())
    );
  }, [inventory, inventoryQuery]);

  const inventoryStats = useMemo(
    () => ({
      total: inventory.length,
      low: inventory.filter((item) => item.stock <= item.minStock).length,
      healthy: inventory.filter((item) => item.stock > item.minStock).length,
    }),
    [inventory]
  );

  const openCreateProcedure = () => {
    setEditingProcedure(null);
    setProcedureForm({ name: "", price: "" });
    setProcedureDialogOpen(true);
  };

  const openEditProcedure = (item: any) => {
    setEditingProcedure(item);
    setProcedureForm({
      name: item.name || "",
      price: String(item.price ?? ""),
    });
    setProcedureDialogOpen(true);
  };

  const saveProcedure = () => {
    if (!procedureForm.name.trim()) {
      toast.error("Procedure name is required");
      return;
    }

    const payload = {
      name: procedureForm.name.trim(),
      price: Number(procedureForm.price || 0),
    };

    if (editingProcedure?.id) {
      updateProcedure.mutate({ id: editingProcedure.id, payload });
    } else {
      createProcedure.mutate(payload);
    }
  };

  const addInventoryRow = () => {
    const id = `INV-${Date.now()}`;
    setInventory((current) => [
      {
        id,
        name: "New Item",
        strength: "",
        form: "Material",
        stock: 0,
        minStock: 0,
        expiry: "",
        supplier: "",
      },
      ...current,
    ]);
  };

  const patchInventory = (id: string, key: keyof LocalInventoryItem, value: string | number) => {
    setInventory((current) =>
      current.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const removeInventory = (id: string) => {
    setInventory((current) => current.filter((item) => item.id !== id));
    toast.success("Inventory item removed");
  };

  if (proceduresQuery.isLoading) {
    return (
      <div className="luxury-page space-y-5">
        <Skeleton className="h-14 w-72 rounded-2xl" />
        <Skeleton className="h-[620px] rounded-[28px]" />
      </div>
    );
  }

  return (
    <motion.div
      className="luxury-page space-y-5"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <section className="luxury-panel p-6 sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="luxury-subtitle mb-2">Supplies and procedures</p>
            <h1 className="luxury-title text-4xl font-semibold sm:text-5xl">
              Clinical stock view and procedure pricing desk
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              Search medicines, maintain procedure fees, and track local stock readiness from one clean workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={addInventoryRow}>
              <Package2 className="h-4 w-4" />
              Add stock item
            </Button>
            <Button onClick={openCreateProcedure}>
              <Plus className="h-4 w-4" />
              Add procedure
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_.95fr]">
        <Card className="luxury-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl">Procedure pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {procedures.length === 0 ? (
              <div className="rounded-[24px] bg-secondary/15 p-6 text-sm text-muted-foreground">
                No procedures available yet.
              </div>
            ) : (
              procedures.map((item: any) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-[24px] border border-border/60 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-foreground">{item.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Current fee: ₹{Number(item.price || 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditProcedure(item)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteProcedure.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="luxury-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl">Medicine lookup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={medicineQuery}
                onChange={(e) => setMedicineQuery(e.target.value)}
                placeholder="Search medicines by name..."
                className="pl-9"
              />
            </div>

            {!debouncedMedicine || debouncedMedicine.trim().length < 2 ? (
              <div className="rounded-[24px] bg-secondary/15 p-6 text-sm text-muted-foreground">
                Type at least 2 characters to search the medicine database.
              </div>
            ) : medicineResults.length === 0 ? (
              <div className="rounded-[24px] bg-secondary/15 p-6 text-sm text-muted-foreground">
                No medicine matches found.
              </div>
            ) : (
              <div className="space-y-3">
                {medicineResults.map((item: any) => (
                  <div
                    key={item.id || item.brandname}
                    className="rounded-[24px] border border-border/60 bg-white/80 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          {item.brandname || item.name}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.strength || item.dose || "Strength not listed"} ·{" "}
                          {item.form || "Medicine"}
                        </p>
                      </div>

                      {item.issaved ? (
                        <Badge className="bg-primary text-primary-foreground">Saved</Badge>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {item.frequency ? <Badge variant="outline">{item.frequency}</Badge> : null}
                      {item.duration ? <Badge variant="outline">{item.duration}</Badge> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="luxury-card">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="text-2xl">Local inventory board</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Editable stock workspace for in-clinic tracking.
            </p>
          </div>

          <div className="flex w-full max-w-md items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={inventoryQuery}
                onChange={(e) => setInventoryQuery(e.target.value)}
                placeholder="Search stock..."
                className="pl-9"
              />
            </div>

            <Badge variant="outline">Low stock {inventoryStats.low}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] border border-border/60 bg-secondary/15 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Items</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{inventoryStats.total}</p>
            </div>
            <div className="rounded-[24px] border border-border/60 bg-secondary/15 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Healthy</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{inventoryStats.healthy}</p>
            </div>
            <div className="rounded-[24px] border border-border/60 bg-secondary/15 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Low stock</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{inventoryStats.low}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[24px] border border-border/60">
            <Table>
              <TableHeader className="bg-secondary/15">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Strength</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Min</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Remove</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredInventory.map((item) => {
                  const low = item.stock <= item.minStock;
                  return (
                    <TableRow key={item.id} className="hover:bg-secondary/10">
                      <TableCell>
                        <Input
                          value={item.name}
                          onChange={(e) => patchInventory(item.id, "name", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.strength}
                          onChange={(e) => patchInventory(item.id, "strength", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.form}
                          onChange={(e) => patchInventory(item.id, "form", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.stock}
                          onChange={(e) => patchInventory(item.id, "stock", Number(e.target.value))}
                          className={low ? "border-warning/50" : ""}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.minStock}
                          onChange={(e) =>
                            patchInventory(item.id, "minStock", Number(e.target.value))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.expiry}
                          onChange={(e) => patchInventory(item.id, "expiry", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.supplier}
                          onChange={(e) => patchInventory(item.id, "supplier", e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeInventory(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      No inventory items match your search.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={procedureDialogOpen} onOpenChange={setProcedureDialogOpen}>
        <DialogContent className="rounded-[28px]">
          <DialogHeader>
            <DialogTitle>
              {editingProcedure ? "Edit procedure" : "Create procedure"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Procedure name</Label>
              <div className="relative">
                <Pill className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={procedureForm.name}
                  onChange={(e) =>
                    setProcedureForm((current) => ({ ...current, name: e.target.value }))
                  }
                  className="pl-9"
                  placeholder="e.g. Root Canal"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Price</Label>
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="number"
                  value={procedureForm.price}
                  onChange={(e) =>
                    setProcedureForm((current) => ({ ...current, price: e.target.value }))
                  }
                  className="pl-9"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setProcedureDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={saveProcedure}
                disabled={createProcedure.isPending || updateProcedure.isPending}
              >
                {createProcedure.isPending || updateProcedure.isPending
                  ? "Saving..."
                  : editingProcedure
                    ? "Update"
                    : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default Pharmacy;