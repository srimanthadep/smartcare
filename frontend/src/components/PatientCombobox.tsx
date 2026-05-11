import * as React from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePatientsSearch } from "@/hooks/usePatientsSearch";
import { Patient } from "@/types";

interface PatientComboboxProps {
  value: string;
  onSelect: (patient: Patient) => void;
  placeholder?: string;
  initialLabel?: string;
}

export function PatientCombobox({ value, onSelect, placeholder = "Search patient by name or ID...", initialLabel = "" }: PatientComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState(initialLabel);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const { data: patients, isLoading } = usePatientsSearch(searchQuery);

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
    setOpen(true);
  };

  const handleSelect = (patient: Patient) => {
    setSearchQuery(patient.name);
    onSelect(patient);
    setOpen(false);
  };

  const showDropdown = open && searchQuery.length >= 2;

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => {
            if (searchQuery.length >= 2) setOpen(true);
          }}
          className="w-full pl-9"
        />
      </div>
      
      {showDropdown && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground">Searching...</span>
            </div>
          ) : patients && patients.length > 0 ? (
            <ul className="p-1">
              {patients.map((patient) => (
                <li
                  key={patient.id}
                  onClick={() => handleSelect(patient)}
                  className="relative flex cursor-pointer select-none items-start flex-col gap-0.5 rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                >
                  <div className="font-medium">{patient.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    ID: {patient.id} • {patient.phone} • {patient.age}y {patient.gender}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No patients found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
