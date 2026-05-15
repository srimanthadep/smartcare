import React, { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Image, FileText, Loader2 } from "lucide-react";
import ToothPicker from "./ToothPicker";
import type { XRayType } from "@/types";

interface XRayUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (formData: FormData) => Promise<void>;
  patientId: string;
  isUploading: boolean;
}

const XRAY_TYPES: XRayType[] = ["IOPA", "OPG", "CBCT", "Bitewing", "Cephalometric"];

const XRayUploadModal: React.FC<XRayUploadModalProps> = ({
  open,
  onClose,
  onUpload,
  patientId,
  isUploading,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [type, setType] = useState<XRayType>("IOPA");
  const [toothNumbers, setToothNumbers] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [takenDate, setTakenDate] = useState(new Date().toISOString().slice(0, 10));
  const [dragActive, setDragActive] = useState(false);

  const resetForm = useCallback(() => {
    setFile(null);
    setPreview(null);
    setType("IOPA");
    setToothNumbers([]);
    setNotes("");
    setDiagnosis("");
    setTags([]);
    setTagInput("");
    setTakenDate(new Date().toISOString().slice(0, 10));
  }, []);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFile = async (selectedFile: File) => {
    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(selectedFile.type)) {
      return;
    }
    // Validate size (15MB)
    if (selectedFile.size > 15 * 1024 * 1024) {
      return;
    }

    // Client-side image compression for large images
    let processedFile = selectedFile;
    if (selectedFile.type.startsWith("image/") && selectedFile.size > 2 * 1024 * 1024) {
      try {
        const imageCompression = (await import("browser-image-compression")).default;
        processedFile = await imageCompression(selectedFile, {
          maxSizeMB: 2,
          maxWidthOrHeight: 4096,
          useWebWorker: true,
          preserveExif: true,
        });
      } catch {
        processedFile = selectedFile; // Fallback to original
      }
    }

    setFile(processedFile);

    // Create preview
    if (processedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(processedFile);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, []);

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("patientId", patientId);
    formData.append("type", type);
    formData.append("toothNumbers", JSON.stringify(toothNumbers));
    formData.append("notes", notes);
    formData.append("diagnosis", diagnosis);
    formData.append("tags", JSON.stringify(tags));
    formData.append("takenDate", takenDate);

    await onUpload(formData);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload X-Ray
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          {!file ? (
            <div
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-secondary/20"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              <Image className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="mb-1 text-sm font-medium">Drag & drop your X-Ray here</p>
              <p className="mb-3 text-xs text-muted-foreground">JPG, PNG, WEBP, or PDF • Max 15MB</p>
              <label>
                <input
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                  <span>Browse Files</span>
                </Button>
              </label>
            </div>
          ) : (
            <div className="relative rounded-xl border border-border overflow-hidden">
              {preview ? (
                <img src={preview} alt="Preview" className="w-full max-h-48 object-contain bg-black/5" />
              ) : (
                <div className="flex items-center justify-center gap-2 p-6 bg-secondary/20">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
              )}
              <button
                onClick={() => { setFile(null); setPreview(null); }}
                className="absolute right-2 top-2 rounded-full bg-background/80 p-1 hover:bg-background"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="p-2 bg-secondary/10 text-xs text-muted-foreground">
                {file.name} • {(file.size / 1024 / 1024).toFixed(1)}MB
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* X-Ray Type */}
            <div className="space-y-1.5">
              <Label>X-Ray Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as XRayType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {XRAY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Taken */}
            <div className="space-y-1.5">
              <Label>Date Taken</Label>
              <Input
                type="date"
                value={takenDate}
                onChange={(e) => setTakenDate(e.target.value)}
              />
            </div>
          </div>

          {/* Tooth Numbers */}
          <div className="space-y-1.5">
            <Label>Tooth Numbers</Label>
            <ToothPicker selected={toothNumbers} onChange={setToothNumbers} compact />
          </div>

          {/* Diagnosis */}
          <div className="space-y-1.5">
            <Label>Diagnosis</Label>
            <Textarea
              placeholder="Enter diagnosis findings..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Clinical Notes</Label>
            <Textarea
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addTag(); }
                }}
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={addTag}>Add</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 cursor-pointer" onClick={() => setTags(tags.filter((t) => t !== tag))}>
                    {tag} <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!file || isUploading}>
            {isUploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" /> Upload X-Ray</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default XRayUploadModal;
