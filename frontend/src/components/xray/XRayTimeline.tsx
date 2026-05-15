import React from "react";
import { Badge } from "@/components/ui/badge";
import type { XRay } from "@/types";

interface XRayTimelineProps {
  xrays: XRay[];
  onView: (xray: XRay) => void;
}

/**
 * Groups x-rays by month/year and displays them in a chronological timeline.
 */
const XRayTimeline: React.FC<XRayTimelineProps> = ({ xrays, onView }) => {
  // Group by month
  const grouped = xrays.reduce<Record<string, XRay[]>>((acc, xray) => {
    const date = xray.takenDate || xray.createdAt;
    const key = date ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long" }) : "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(xray);
    return acc;
  }, {});

  const months = Object.keys(grouped);

  if (months.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground italic">
        No x-rays to display in timeline
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      {months.map((month) => (
        <div key={month} className="relative pl-10">
          {/* Dot */}
          <div className="absolute left-[11px] top-1 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />

          {/* Month label */}
          <h3 className="mb-3 text-sm font-bold text-foreground">{month}</h3>

          {/* X-ray entries */}
          <div className="space-y-2">
            {grouped[month].map((xray) => (
              <div
                key={xray.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-secondary/20 cursor-pointer"
                onClick={() => onView(xray)}
              >
                {/* Thumbnail */}
                <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-secondary/30">
                  {xray.thumbnailUrl ? (
                    <img
                      src={xray.thumbnailUrl}
                      alt={xray.type}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                      PDF
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-[10px]">{xray.type}</Badge>
                    {xray.toothNumbers.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        Teeth: {xray.toothNumbers.slice(0, 3).map((t) => `#${t}`).join(", ")}
                        {xray.toothNumbers.length > 3 ? ` +${xray.toothNumbers.length - 3}` : ""}
                      </span>
                    )}
                  </div>
                  {xray.diagnosis && (
                    <p className="text-xs text-foreground/80 truncate">{xray.diagnosis}</p>
                  )}
                </div>

                {/* Status */}
                <div className="shrink-0">
                  {xray.reviewed ? (
                    <Badge className="bg-emerald-600/90 text-[10px] text-white">Reviewed</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">Pending</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default XRayTimeline;
