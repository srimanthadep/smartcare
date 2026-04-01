import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { mockInventory, type InventoryItem } from '@/data/mockData';
import { Pill, Plus, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

const Pharmacy: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>(mockInventory);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const text = `${i.name} ${i.strength} ${i.form} ${i.supplier}`.toLowerCase();
      return text.includes(query.toLowerCase());
    });
  }, [items, query]);

  const lowStock = filtered.filter((i) => i.stock < i.minStock);

  const AdjustStockDialog = ({ item }: { item: InventoryItem }) => {
    const [stock, setStock] = useState(item.stock);
    const [minStock, setMinStock] = useState(item.minStock);

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">Adjust</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Adjust stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border/50 p-4 bg-secondary/20">
              <p className="font-medium">{item.name} {item.strength}</p>
              <p className="text-xs text-muted-foreground">{item.form} · Supplier: {item.supplier}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Current stock</Label>
                <Input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Minimum stock</Label>
                <Input type="number" value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, stock, minStock } : x)));
                  toast.success('Stock updated (mock)');
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Dental Supplies</h1>
          <p className="text-sm text-muted-foreground">Inventory, stock alerts and quick adjustments</p>
        </div>
        <Button
          variant="outline"
          onClick={() => toast.message('Mock action', { description: 'This would open a purchase order / supplier workflow.' })}
        >
          <Plus className="h-4 w-4 mr-1" /> Create reorder
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="border-border/50 xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Pill className="h-4 w-4" /> Inventory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search supplies, materials, supplier…" />

            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((i) => {
                    const isLow = i.stock < i.minStock;
                    return (
                      <TableRow key={i.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <Pill className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{i.name} {i.strength}</p>
                              <p className="text-xs text-muted-foreground">{i.form} · Min {i.minStock}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{i.expiry}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{i.supplier}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isLow && <Badge variant="destructive" className="text-xs">Low</Badge>}
                            <span className="font-medium">{i.stock}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <AdjustStockDialog item={i} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-warning" /> Low stock alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">All good — no low stock items</div>
            ) : (
              lowStock.map((i) => (
                <div key={i.id} className="rounded-lg border border-border/50 bg-secondary/20 p-4">
                  <p className="font-medium">{i.name} {i.strength}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stock {i.stock} / Min {i.minStock} · Exp {i.expiry}
                  </p>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toast.message('Mock reorder', { description: `Reorder request created for ${i.name}` })}
                    >
                      Reorder
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default Pharmacy;

