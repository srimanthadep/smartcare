import React from "react";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { Search, X, RotateCcw } from "lucide-react";

interface XRayFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  type: string;
  onTypeChange: (val: string) => void;
  reviewed: string;
  onReviewedChange: (val: string) => void;
  onReset: () => void;
}

const XRayFilters: React.FC<XRayFiltersProps> = ({
  search,
  onSearchChange,
  type,
  onTypeChange,
  reviewed,
  onReviewedChange,
  onReset,
}) => {
  const hasFilters = search || type !== "all" || reviewed !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search patient, diagnosis, tags..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-9"
        />
        {search && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => onSearchChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Type filter */}
      <Select value={type} onValueChange={onTypeChange}>
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="IOPA">IOPA</SelectItem>
          <SelectItem value="OPG">OPG</SelectItem>
          <SelectItem value="CBCT">CBCT</SelectItem>
          <SelectItem value="Bitewing">Bitewing</SelectItem>
          <SelectItem value="Cephalometric">Cephalometric</SelectItem>
        </SelectContent>
      </Select>

      {/* Review status */}
      <Select value={reviewed} onValueChange={onReviewedChange}>
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="true">Reviewed</SelectItem>
          <SelectItem value="false">Pending</SelectItem>
        </SelectContent>
      </Select>

      {/* Reset */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onReset} className="h-9 gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      )}
    </div>
  );
};

export default XRayFilters;
