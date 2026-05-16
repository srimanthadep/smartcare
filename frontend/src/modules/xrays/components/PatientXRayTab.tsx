import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from '@/shared/lib/api';
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { Upload, Grid3X3, Clock, ScanLine, Columns2 } from "lucide-react";
import XRayCard from "./XRayCard";
import XRayViewer from "./XRayViewer";
import XRayCompareViewer from "./XRayCompareViewer";
import XRayTimeline from "./XRayTimeline";
import XRayUploadModal from "./XRayUploadModal";
import XRayFilters from "./XRayFilters";
import type { XRay } from "@/shared/types";

interface PatientXRayTabProps {
  patientId: string;
}

const PatientXRayTab: React.FC<PatientXRayTabProps> = ({ patientId }) => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"gallery" | "timeline">("gallery");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewingXray, setViewingXray] = useState<XRay | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<XRay[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [reviewedFilter, setReviewedFilter] = useState("all");

  const { data: xrays, isLoading } = useQuery({
    queryKey: ["patient-xrays", patientId],
    queryFn: () => api.getPatientXrays(patientId),
    enabled: !!patientId,
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => api.uploadXray(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-xrays", patientId] });
      setUploadOpen(false);
      toast.success("X-Ray uploaded successfully");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteXray(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-xrays", patientId] });
      toast.success("X-Ray deleted");
    },
    onError: () => toast.error("Failed to delete X-Ray"),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, reviewed }: { id: string; reviewed: boolean }) =>
      api.reviewXray(id, reviewed),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["patient-xrays", patientId] });
      setViewingXray(updated);
      toast.success(updated.reviewed ? "Marked as reviewed" : "Marked as pending");
    },
    onError: () => toast.error("Failed to update review status"),
  });

  // Apply client-side filters
  const filteredXrays = (xrays || []).filter((xray) => {
    if (typeFilter !== "all" && xray.type !== typeFilter) return false;
    if (reviewedFilter !== "all" && String(xray.reviewed) !== reviewedFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        xray.diagnosis?.toLowerCase().includes(s) ||
        xray.notes?.toLowerCase().includes(s) ||
        xray.tags?.some((t) => t.toLowerCase().includes(s)) ||
        xray.toothNumbers?.some((t) => t.toString().includes(s))
      );
    }
    return true;
  }).sort((a, b) => {
    const dateDiff = new Date(b.takenDate || b.createdAt).getTime() - new Date(a.takenDate || a.createdAt).getTime();
    return dateDiff !== 0 ? dateDiff : (b.id || "").localeCompare(a.id || "");
  });

  const handleCompareSelect = (xray: XRay) => {
    setSelectedForCompare((prev) => {
      if (prev.find((x) => x.id === xray.id)) {
        return prev.filter((x) => x.id !== xray.id);
      }
      if (prev.length >= 2) {
        return [prev[1], xray]; // Replace oldest
      }
      return [...prev, xray];
    });
  };

  const handleDownload = (xray: XRay) => {
    toast.promise(
      api.downloadXrayReport(xray.id),
      { loading: "Generating Report...", success: "Report Downloaded!", error: "Failed to generate report" }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-primary" />
          <h2 className="text-base font-heading font-bold">
            X-Rays ({xrays?.length || 0})
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border/50 overflow-hidden">
            <button
              onClick={() => setViewMode("gallery")}
              className={`px-3 py-1.5 text-xs transition-colors ${
                viewMode === "gallery" ? "bg-primary text-primary-foreground" : "hover:bg-secondary/50"
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1.5 text-xs transition-colors ${
                viewMode === "timeline" ? "bg-primary text-primary-foreground" : "hover:bg-secondary/50"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Compare */}
          <Button
            variant={compareMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setCompareMode(!compareMode);
              setSelectedForCompare([]);
            }}
          >
            <Columns2 className="mr-1.5 h-3.5 w-3.5" />
            {compareMode ? "Cancel" : "Compare"}
          </Button>

          {/* Upload */}
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Upload X-Ray
          </Button>
        </div>
      </div>

      {/* Compare action bar */}
      {compareMode && selectedForCompare.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <span className="text-sm">
            {selectedForCompare.length}/2 selected for comparison
          </span>
          {selectedForCompare.length === 2 && (
            <Button size="sm" onClick={() => setCompareOpen(true)}>
              Compare Now
            </Button>
          )}
        </div>
      )}

      {/* Filters */}
      <XRayFilters
        search={search}
        onSearchChange={setSearch}
        type={typeFilter}
        onTypeChange={setTypeFilter}
        reviewed={reviewedFilter}
        onReviewedChange={setReviewedFilter}
        onReset={() => {
          setSearch("");
          setTypeFilter("all");
          setReviewedFilter("all");
        }}
      />

      {/* Content */}
      {filteredXrays.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <ScanLine className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {xrays?.length === 0
                  ? "No x-rays uploaded yet for this patient"
                  : "No x-rays match the current filters"}
              </p>
              {xrays?.length === 0 && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setUploadOpen(true)}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload First X-Ray
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "timeline" ? (
        <XRayTimeline xrays={filteredXrays} onView={setViewingXray} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredXrays.map((xray) => (
            <XRayCard
              key={xray.id}
              xray={xray}
              onView={setViewingXray}
              onDelete={(id) => deleteMutation.mutate(id)}
              onDownload={handleDownload}
              selectable={compareMode}
              selected={selectedForCompare.some((x) => x.id === xray.id)}
              onSelect={handleCompareSelect}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <XRayUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={async (formData) => { await uploadMutation.mutateAsync(formData); }}
        patientId={patientId}
        isUploading={uploadMutation.isPending}
      />

      <XRayViewer
        xray={viewingXray}
        open={!!viewingXray}
        onClose={() => setViewingXray(null)}
        onReview={(id, reviewed) => reviewMutation.mutate({ id, reviewed })}
        onDownload={handleDownload}
        onUpdate={(updated) => {
          setViewingXray(updated);
          queryClient.invalidateQueries({ queryKey: ["patient-xrays", patientId] });
        }}
      />

      <XRayCompareViewer
        xrays={selectedForCompare}
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
      />
    </div>
  );
};

export default PatientXRayTab;
