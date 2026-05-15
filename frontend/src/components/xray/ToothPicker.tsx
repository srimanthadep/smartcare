import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

// FDI Tooth Numbering System
const QUADRANTS = [
  { label: "Upper Right", teeth: [18, 17, 16, 15, 14, 13, 12, 11] },
  { label: "Upper Left", teeth: [21, 22, 23, 24, 25, 26, 27, 28] },
  { label: "Lower Left", teeth: [38, 37, 36, 35, 34, 33, 32, 31] },
  { label: "Lower Right", teeth: [41, 42, 43, 44, 45, 46, 47, 48] },
];

interface ToothPickerProps {
  selected: number[];
  onChange: (teeth: number[]) => void;
  compact?: boolean;
}

const ToothPicker: React.FC<ToothPickerProps> = ({ selected, onChange, compact = false }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const toggleTooth = (num: number) => {
    if (selected.includes(num)) {
      onChange(selected.filter((t) => t !== num));
    } else {
      onChange([...selected, num].sort((a, b) => a - b));
    }
  };

  const filteredQuadrants = searchTerm
    ? QUADRANTS.map((q) => ({
        ...q,
        teeth: q.teeth.filter((t) => t.toString().includes(searchTerm)),
      })).filter((q) => q.teeth.length > 0)
    : QUADRANTS;

  return (
    <div className="space-y-2">
      {/* Search */}
      <input
        type="text"
        placeholder="Search tooth number..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value.replace(/\D/g, ""))}
        className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />

      {/* Selected badges */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((num) => (
            <Badge
              key={num}
              variant="secondary"
              className="cursor-pointer gap-1 text-xs hover:bg-destructive/20"
              onClick={() => toggleTooth(num)}
            >
              #{num}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-[10px] text-muted-foreground"
            onClick={() => onChange([])}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Grid */}
      <div className={`grid ${compact ? "grid-cols-1 gap-1" : "grid-cols-2 gap-2"}`}>
        {filteredQuadrants.map((quadrant) => (
          <div key={quadrant.label} className="rounded-lg border border-border/50 p-2">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {quadrant.label}
            </p>
            <div className="flex flex-wrap gap-1">
              {quadrant.teeth.map((num) => {
                const isSelected = selected.includes(num);
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => toggleTooth(num)}
                    className={`flex h-7 w-7 items-center justify-center rounded text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary/50 text-foreground hover:bg-secondary"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToothPicker;
