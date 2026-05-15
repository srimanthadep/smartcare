import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import StatsCard from "@/components/StatsCard";
import {
  ScanLine, Upload, Image, Clock, CheckCircle, TrendingUp,
  Grid3X3, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import XRayCard from "@/components/xray/XRayCard";
import XRayViewer from "@/components/xray/XRayViewer";
import XRayUploadModal from "@/components/xray/XRayUploadModal";
import XRayFilters from "@/components/xray/XRayFilters";
import { PatientCombobox } from "@/components/PatientCombobox";
import type { XRay } from "@/types";

const PIE_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"];

const XRays: React.FC = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = "X-Ray Management | Siara Dental";
  }, []);

  // State
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [reviewedFilter, setReviewedFilter] = useState("all");
  const [viewingXray, setViewingXray] = useState<XRay | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [quickUploadPatientId, setQuickUploadPatientId] = useState("");
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Queries
  const { data: xrays, isLoading } = useQuery({
    queryKey: ["xrays", { search, type: typeFilter, reviewed: reviewedFilter }],
    queryFn: () =>
      api.getXrays({
        search: search || undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        reviewed: reviewedFilter !== "all" ? reviewedFilter : undefined,
      }),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["xray-stats"],
    queryFn: () => api.getXrayStats(),
  });

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => api.uploadXray(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["xrays"] });
      queryClient.invalidateQueries({ queryKey: ["xray-stats"] });
      setUploadOpen(false);
      toast.success("X-Ray uploaded successfully");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Upload failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteXray(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["xrays"] });
      queryClient.invalidateQueries({ queryKey: ["xray-stats"] });
      toast.success("X-Ray deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, reviewed }: { id: string; reviewed: boolean }) =>
      api.reviewXray(id, reviewed),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["xrays"] });
      queryClient.invalidateQueries({ queryKey: ["xray-stats"] });
      setViewingXray(updated);
      toast.success(updated.reviewed ? "Marked as reviewed" : "Marked as pending");
    },
    onError: () => toast.error("Failed to update review status"),
  });

  const handleDownload = (xray: XRay) => {
    toast.promise(
      api.downloadXray(xray.fileUrl, `XRay_${xray.id}_${xray.type}.${xray.fileUrl.endsWith('.pdf') ? 'pdf' : 'jpg'}`),
      { loading: "Downloading...", success: "Downloaded!", error: "Failed to download" }
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-heading font-bold">
            <ScanLine className="h-6 w-6 text-primary" />
            X-Ray Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage all clinic dental x-rays
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showAnalytics ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Analytics
          </Button>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Quick Upload
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatsCard
              title="Total X-Rays"
              value={stats?.total || 0}
              icon={Image}
              trend="Total uploaded"
            />
            <StatsCard
              title="This Month"
              value={stats?.monthlyUploads || 0}
              icon={TrendingUp}
              trend="Monthly uploads"
            />
            <StatsCard
              title="Pending Review"
              value={stats?.pendingReview || 0}
              icon={Clock}
              trend="Awaiting review"
            />
            <StatsCard
              title="Reviewed"
              value={(stats?.total || 0) - (stats?.pendingReview || 0)}
              icon={CheckCircle}
              trend="Completed reviews"
            />
          </>
        )}
      </div>

      {/* Analytics charts */}
      {showAnalytics && stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Monthly trend */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-heading">Uploads Per Month</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Type distribution */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-heading">X-Ray Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.typeDistribution.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie
                        data={stats.typeDistribution}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={40}
                      >
                        {stats.typeDistribution.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {stats.typeDistribution.map((item, i) => (
                      <div key={item.type} className="flex items-center gap-2 text-xs">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="text-muted-foreground">{item.type}</span>
                        <span className="font-bold">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
              )}
            </CardContent>
          </Card>
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

      {/* X-Ray grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : xrays && xrays.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {xrays.map((xray) => (
            <XRayCard
              key={xray.id}
              xray={xray}
              onView={setViewingXray}
              onDelete={(id) => deleteMutation.mutate(id)}
              onDownload={handleDownload}
            />
          ))}
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <ScanLine className="mb-3 h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground mb-1">No x-rays found</p>
              <p className="text-xs text-muted-foreground mb-4">
                {search || typeFilter !== "all" || reviewedFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Upload your first x-ray to get started"}
              </p>
              <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload X-Ray
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Upload Modal — requires patient selection */}
      {uploadOpen && (
        <div>
          {!quickUploadPatientId ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <Card className="w-full max-w-md mx-4">
                <CardHeader>
                  <CardTitle className="text-base">Select Patient</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PatientCombobox
                    value={quickUploadPatientId}
                    onSelect={(patient) => setQuickUploadPatientId(patient.id)}
                    placeholder="Search patient..."
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setUploadOpen(false); setQuickUploadPatientId(""); }}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <XRayUploadModal
              open={uploadOpen}
              onClose={() => { setUploadOpen(false); setQuickUploadPatientId(""); }}
              onUpload={(formData) => uploadMutation.mutateAsync(formData)}
              patientId={quickUploadPatientId}
              isUploading={uploadMutation.isPending}
            />
          )}
        </div>
      )}

      {/* Viewer */}
      <XRayViewer
        xray={viewingXray}
        open={!!viewingXray}
        onClose={() => setViewingXray(null)}
        onReview={(id, reviewed) => reviewMutation.mutate({ id, reviewed })}
        onDownload={handleDownload}
        onUpdate={(updated) => {
          setViewingXray(updated);
          queryClient.invalidateQueries({ queryKey: ["xrays"] });
        }}
      />
    </motion.div>
  );
};

export default XRays;
