import * as React from "react";
import { Input } from "@/shared/ui/input";
import { Procedure } from "@/shared/types";

interface ProcedureComboboxProps {
  value: string;
  onChange: (value: string, procedure?: Procedure) => void;
  procedures: Procedure[];
  placeholder?: string;
}

export function ProcedureCombobox({ value, onChange, procedures, placeholder = "Search or type procedure..." }: ProcedureComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState(value || "");
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  // Sync internal search query if external value changes
  React.useEffect(() => {
    setSearchQuery(value);
  }, [value]);

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

  const handleSelect = (proc: Procedure) => {
    setSearchQuery(proc.name);
    onChange(proc.name, proc);
    setOpen(false);
  };

  const filteredProcedures = procedures.filter((p) => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const showDropdown = open;

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <Input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        className="w-full"
      />
      
      {showDropdown && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 max-h-[300px] overflow-y-auto">
          {filteredProcedures.length > 0 ? (
            <ul className="p-1">
              {filteredProcedures.map((proc) => (
                <li
                  key={proc.id}
                  onClick={() => handleSelect(proc)}
                  className="relative flex min-h-[40px] cursor-pointer select-none flex-col items-start gap-1 rounded-sm px-4 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-medium">{proc.name}</span>
                    <span className="text-xs text-muted-foreground">₹{proc.price}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchQuery ? `No exact match found. You can keep typing to use "${searchQuery}".` : "No procedures available."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
