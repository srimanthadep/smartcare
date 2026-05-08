import * as React from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMedicinesSearch } from "@/hooks/useMedicinesSearch";
import { MedicineSearchItem } from "@/types";

interface MedicineComboboxProps {
  value: string;
  onChange: (value: string, medicine?: MedicineSearchItem) => void;
  placeholder?: string;
}

export function MedicineCombobox({ value, onChange, placeholder = "Search or type medicine..." }: MedicineComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState(value || "");
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  // Sync internal search query if external value changes (e.g. AI generation)
  React.useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  const { data: medicines, isLoading } = useMedicinesSearch(searchQuery);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    onChange(val); // Always update the parent with whatever is typed
    setOpen(true);
  };

  const handleSelect = (medicine: MedicineSearchItem) => {
    setSearchQuery(medicine.brand_name);
    onChange(medicine.brand_name, medicine);
    setOpen(false);
  };

  const showDropdown = open && searchQuery.length >= 2;

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <Input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={() => {
          if (searchQuery.length >= 2) setOpen(true);
        }}
        className="w-full"
      />
      
      {showDropdown && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground">Searching...</span>
            </div>
          ) : medicines && medicines.length > 0 ? (
            <ul className="p-1">
              {medicines.map((medicine) => (
                <li
                  key={medicine.id}
                  onClick={() => handleSelect(medicine)}
                  className="relative flex cursor-pointer select-none items-start flex-col gap-1 rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-medium">{medicine.brand_name}</span>
                    {medicine.strength && (
                      <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                        {medicine.strength}
                      </span>
                    )}
                  </div>
                  {medicine.generic_name && (
                    <span className="text-xs text-muted-foreground truncate w-full">
                      {medicine.generic_name}
                    </span>
                  )}
                  <div className="flex w-full justify-between mt-1">
                    {medicine.dosage_form && (
                      <span className="text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded text-muted-foreground">
                        {medicine.dosage_form}
                      </span>
                    )}
                    {medicine.manufacturer && (
                      <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider truncate ml-2">
                        {medicine.manufacturer}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No exact match found. You can keep typing to use "{searchQuery}".
            </div>
          )}
        </div>
      )}
    </div>
  );
}
