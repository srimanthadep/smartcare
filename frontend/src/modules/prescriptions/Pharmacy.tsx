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

import { mockInventory } from '@/shared/data/mockData';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { api } from '@/shared/lib/api';
import { safeLocalStorageParse } from '@/shared/lib/storage';

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

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
  return safeLocalStorageParse<LocalInventoryItem[]>(INVENTORY_KEY, mockInventory as LocalInventoryItem[]);
}

const Pharmacy: React.FC = () => {
  const queryClient = useQueryClient();

  const [inventory, setInventory] = useState<LocalInventoryItem[]>(loadInventory);
  const [medicineQuery, setMedicineQuery] = useState("");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const createInventory = (medicine: any) => {
    const newItem: LocalInventoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: medicine.brandname || medicine.name,
      strength: medicine.strength || medicine.dose || "",
      form: medicine.form || "Medicine",
      stock: 10,
      minStock: 2,
      expiry: "2025-12-31",
      supplier: "Default Supplier",
    };
    setInventory((prev) => [newItem, ...prev]);
    setMedicineQuery("");
    toast.success("Added to inventory");
  };

  const debouncedMedicine = useDebounce(medicineQuery, 250);

  useEffect(() => {
    document.title = "Pharmacy · Siara Dental";
  }, []);

  useEffect(() => {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
  }, [inventory]);

  const medicineSearchQuery = useQuery({
    queryKey: ["medicines", "search", debouncedMedicine],
    queryFn: async () => {
      if (!debouncedMedicine.trim() || debouncedMedicine.trim().length < 2) return [];
      const res = await api.searchMedicines(debouncedMedicine);
      return res ?? [];
    },
    enabled: true,
  });

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-7xl space-y-3 p-3 md:space-y-6 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-heading font-bold tracking-tight">Pharmacy & Stock</h1>
          <p className="text-sm text-muted-foreground font-medium">Manage clinical inventory and medication supply</p>
        </div>
        <Button variant="outline" onClick={addInventoryRow}>
          <Package2 className="h-4 w-4 mr-2" />
          Add manual item
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:gap-6 lg:grid-cols-2">
        <Card className="rounded-[32px] border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-secondary/50 to-white border-b border-border/40 pb-4">
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" /> Stock Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={medicineQuery}
                onChange={(e) => setMedicineQuery(e.target.value)}
                placeholder="Search for medication to add..."
                className="pl-9"
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              {medicineResults.map((item: any) => (
                <div
                  key={item.id || item.brandname}
                  className="flex items-center justify-between rounded-xl border p-3 hover:bg-secondary/50 cursor-pointer transition-colors"
                  onClick={() => createInventory(item)}
                >
                  <div>
                    <p className="font-medium text-sm">{item.brandname || item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.strength || item.dose}</p>
                  </div>
                  <Badge variant="secondary">Add</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[32px] border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="text-2xl">Local inventory board</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Editable stock workspace for in-clinic tracking.</p>
          </div>

          <div className="sticky top-16 z-20 flex w-full max-w-md items-center gap-3 md:static">
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

          <div className="grid grid-cols-2 gap-3 md:hidden">
            {filteredInventory.map((item) => (
              <Card key={item.id} className="border-border/50">
                <CardContent className="p-3">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.strength || item.form}</p>
                  <p className="mt-1 text-xs">Stock: {item.stock}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-[24px] border border-border/60 md:block">
            <Table>
              <TableHeader className="bg-secondary/15">
                <TableRow>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap">Strength</TableHead>
                  <TableHead className="whitespace-nowrap">Form</TableHead>
                  <TableHead className="whitespace-nowrap">Stock</TableHead>
                  <TableHead className="whitespace-nowrap">Min</TableHead>
                  <TableHead className="whitespace-nowrap">Expiry</TableHead>
                  <TableHead className="whitespace-nowrap">Supplier</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Remove</TableHead>
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
                          autoComplete="off"
                          value={item.stock}
                          onChange={(e) => patchInventory(item.id, "stock", Number(e.target.value))}
                          className={low ? "border-warning/50" : ""}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          autoComplete="off"
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


    </motion.div>
  );
};

export default Pharmacy;
