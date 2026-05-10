import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Procedure } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export const ProcedureSettingsModal = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | "">("");

  const { data: response, isLoading } = useQuery({
    queryKey: ["procedures"],
    queryFn: api.getProcedures,
    enabled: isOpen,
  });

  const procedures = response?.data || [];

  const createMutation = useMutation({
    mutationFn: api.createProcedure,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedures"] });
      toast.success("Procedure added successfully");
      resetForm();
    },
    onError: () => toast.error("Failed to add procedure"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => api.updateProcedure(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedures"] });
      toast.success("Procedure updated successfully");
      resetForm();
    },
    onError: () => toast.error("Failed to update procedure"),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteProcedure,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedures"] });
      toast.success("Procedure deleted successfully");
    },
    onError: () => toast.error("Failed to delete procedure"),
  });

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setPrice("");
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Procedure name is required");
      return;
    }
    
    const payload = { name: name.trim(), price: Number(price) || 0 };

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const startEdit = (p: Procedure) => {
    setEditingId(p.id);
    setName(p.name);
    setPrice(p.price);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-primary/30 text-primary">
          <Settings className="w-3.5 h-3.5 mr-1" />
          Edit Procedures
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Procedure Catalog</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Form */}
          <Card className="border-border/50 bg-secondary/10">
            <CardContent className="p-4">
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-12 sm:col-span-7 space-y-2">
                  <Label>Procedure Name</Label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g. Scaling and Root Planing" 
                  />
                </div>
                <div className="col-span-12 sm:col-span-3 space-y-2">
                  <Label>Default Price (₹)</Label>
                  <Input 
                    type="number" 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : "")} 
                    placeholder="0" 
                  />
                </div>
                <div className="col-span-12 sm:col-span-2">
                  <Button 
                    className="w-full" 
                    onClick={handleSave}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingId ? "Update" : "Add"}
                  </Button>
                </div>
              </div>
              {editingId && (
                <div className="mt-2 text-right">
                  <Button variant="ghost" size="sm" onClick={resetForm} className="text-muted-foreground h-6 text-xs">
                    Cancel Edit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Existing Procedures</h3>
            {isLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary/50" /></div>
            ) : procedures.length === 0 ? (
              <div className="text-center p-8 border border-dashed rounded-md text-muted-foreground">
                No procedures found. Add one above.
              </div>
            ) : (
              <div className="space-y-2">
                {procedures.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 border border-border/50 rounded-md hover:bg-secondary/5 transition-colors">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.id}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-bold">₹{p.price.toLocaleString()}</p>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => startEdit(p)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                          onClick={() => {
                            if (window.confirm("Delete this procedure?")) deleteMutation.mutate(p.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
