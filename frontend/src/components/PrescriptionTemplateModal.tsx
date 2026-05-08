import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Save, X, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

const PrescriptionTemplateModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", notes: "", medicines: [{ name: "", dosage: "", frequency: "", duration: "" }] });
  
  const queryClient = useQueryClient();

  const { data: templatesRes, isLoading } = useQuery({
    queryKey: ["prescription-templates"],
    queryFn: api.getTemplates,
    enabled: isOpen,
  });

  const templates = templatesRes?.data || [];

  const createMutation = useMutation({
    mutationFn: api.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescription-templates"] });
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      resetForm();
      toast.success("Template created");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => api.updateTemplate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescription-templates"] });
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      setEditingId(null);
      resetForm();
      toast.success("Template updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescription-templates"] });
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      toast.success("Template deleted");
    },
  });

  const resetForm = () => {
    setFormData({ name: "", notes: "", medicines: [{ name: "", dosage: "", frequency: "", duration: "" }] });
    setEditingId(null);
  };

  const handleEdit = (tpl: any) => {
    setEditingId(tpl.id);
    setFormData({ name: tpl.name, notes: tpl.notes || "", medicines: tpl.medicines });
  };

  const handleSave = () => {
    if (!formData.name.trim()) return toast.error("Name is required");
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addMedicine = () => {
    setFormData({ ...formData, medicines: [...formData.medicines, { name: "", dosage: "", frequency: "", duration: "" }] });
  };

  const removeMedicine = (index: number) => {
    setFormData({ ...formData, medicines: formData.medicines.filter((_, i) => i !== index) });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ClipboardList className="mr-2 h-4 w-4" /> Manage Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Prescription Templates
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0 overflow-hidden">
          {/* List Section */}
          <div className="flex flex-col gap-4 border-r pr-6 overflow-hidden">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Saved Templates</p>
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                ) : templates.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground italic">No templates yet</div>
                ) : (
                  templates.map((tpl: any) => (
                    <div key={tpl.id} className={`p-3 rounded-lg border transition-all flex items-center justify-between group ${editingId === tpl.id ? 'border-primary bg-primary/5' : 'border-border/50 hover:bg-muted/50'}`}>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{tpl.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{tpl.medicines.length} Medicines</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(tpl)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(tpl.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Form Section */}
          <div className="flex flex-col gap-4 overflow-hidden">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{editingId ? 'Edit Template' : 'New Template'}</p>
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-3 pb-2">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., General Extraction" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Medicines</Label>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={addMedicine}>
                      <Plus className="mr-1 h-3 w-3" /> Add
                    </Button>
                  </div>
                  {formData.medicines.map((med, idx) => (
                    <div key={idx} className="p-3 rounded-md bg-muted/30 border border-border/40 space-y-2 relative">
                      <Button size="icon" variant="ghost" className="absolute -top-2 -right-2 h-5 w-5 bg-background border" onClick={() => removeMedicine(idx)}>
                        <X className="h-2 w-2" />
                      </Button>
                      <Input size="sm" className="h-8 text-xs" placeholder="Medicine" value={med.name} onChange={(e) => {
                        const newMeds = [...formData.medicines];
                        newMeds[idx].name = e.target.value;
                        setFormData({ ...formData, medicines: newMeds });
                      }} />
                      <div className="grid grid-cols-3 gap-2">
                        <Input size="sm" className="h-7 text-[10px]" placeholder="Dose" value={med.dosage} onChange={(e) => {
                          const newMeds = [...formData.medicines];
                          newMeds[idx].dosage = e.target.value;
                          setFormData({ ...formData, medicines: newMeds });
                        }} />
                        <Input size="sm" className="h-7 text-[10px]" placeholder="Freq" value={med.frequency} onChange={(e) => {
                          const newMeds = [...formData.medicines];
                          newMeds[idx].frequency = e.target.value;
                          setFormData({ ...formData, medicines: newMeds });
                        }} />
                        <Input size="sm" className="h-7 text-[10px]" placeholder="Dur" value={med.duration} onChange={(e) => {
                          const newMeds = [...formData.medicines];
                          newMeds[idx].duration = e.target.value;
                          setFormData({ ...formData, medicines: newMeds });
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Default Notes</Label>
                  <Textarea className="min-h-[80px] text-xs" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Follow-up instructions..." />
                </div>
              </div>
            </ScrollArea>
            
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                <Save className="mr-2 h-4 w-4" /> {editingId ? 'Update Template' : 'Create Template'}
              </Button>
              {editingId && (
                <Button variant="ghost" onClick={resetForm}>Cancel</Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrescriptionTemplateModal;
