import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, Trash2, CheckCircle, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { XRay } from "@/types";

interface XRayCardProps {
  xray: XRay;
  onView: (xray: XRay) => void;
  onDelete?: (id: string) => void;
  onDownload?: (xray: XRay) => void;
  onSelect?: (xray: XRay) => void;
  selected?: boolean;
  selectable?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  IOPA: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  OPG: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  CBCT: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Bitewing: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Cephalometric: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const XRayCard: React.FC<XRayCardProps> = ({
  xray,
  onView,
  onDelete,
  onDownload,
  onSelect,
  selected,
  selectable,
}) => {
  const isPdf = xray.fileUrl?.endsWith(".pdf") || xray.fileUrl?.includes("/raw/");

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all duration-200 hover:shadow-md ${
        selected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border/50 hover:border-border"
      } ${selectable ? "cursor-pointer" : ""}`}
      onClick={() => selectable && onSelect?.(xray)}
    >
      {/* Thumbnail */}
      <div
        className="relative aspect-square cursor-pointer overflow-hidden bg-secondary/30"
        onClick={(e) => {
          e.stopPropagation();
          onView(xray);
        }}
      >
        {isPdf ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <path d="M9 15l2 2 4-4" />
            </svg>
            <span className="text-xs font-medium">PDF</span>
          </div>
        ) : (
          <img
            src={xray.thumbnailUrl || xray.fileUrl}
            alt={`${xray.type} X-Ray`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
          <Eye className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        {/* Review status badge */}
        <div className="absolute right-2 top-2">
          {xray.reviewed ? (
            <Badge className="gap-1 bg-emerald-600/90 text-[10px] text-white shadow-sm">
              <CheckCircle className="h-3 w-3" /> Reviewed
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 border-amber-500/30 bg-background/80 text-[10px] text-amber-600 shadow-sm">
              <Clock className="h-3 w-3" /> Pending
            </Badge>
          )}
        </div>

        {/* Select checkbox for compare mode */}
        {selectable && (
          <div className="absolute left-2 top-2">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                selected
                  ? "border-primary bg-primary text-white"
                  : "border-white/70 bg-black/20"
              }`}
            >
              {selected && <CheckCircle className="h-3 w-3" />}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className={`text-[10px] ${TYPE_COLORS[xray.type] || ""}`}>
            {xray.type}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{xray.takenDate}</span>
        </div>

        {xray.toothNumbers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {xray.toothNumbers.slice(0, 4).map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px] px-1.5">
                #{t}
              </Badge>
            ))}
            {xray.toothNumbers.length > 4 && (
              <Badge variant="secondary" className="text-[10px] px-1.5">
                +{xray.toothNumbers.length - 4}
              </Badge>
            )}
          </div>
        )}

        {xray.diagnosis && (
          <p className="truncate text-xs text-muted-foreground">{xray.diagnosis}</p>
        )}

        {xray.patientName && (
          <p className="truncate text-xs font-medium text-foreground/80">{xray.patientName}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(xray);
                  }}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View</TooltipContent>
            </Tooltip>

            {onDownload && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(xray);
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>
            )}

            {onDelete && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(xray.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};

export default XRayCard;
