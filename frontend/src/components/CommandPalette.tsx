import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, FileText, LayoutDashboard, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const CommandPalette: React.FC<Props> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { data: patients = [] } = useQuery({
    queryKey: ["patients", "command-palette"],
    queryFn: () => api.getPatients({}),
  });

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const patientMatches = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return patients.slice(0, 6);
    return patients.filter((patient) => patient.name.toLowerCase().includes(value) || patient.id.toLowerCase().includes(value)).slice(0, 8);
  }, [patients, query]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed bottom-0 left-0 right-0 w-full overflow-hidden rounded-t-2xl p-0 md:static md:w-auto md:rounded-xl">
        <Command>
          <CommandInput placeholder="Search patients or jump to..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Quick actions">
              <CommandItem onSelect={() => go("/")}>
                <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
              </CommandItem>
              <CommandItem onSelect={() => go("/patients")}>
                <Users className="mr-2 h-4 w-4" /> Patients
              </CommandItem>
              <CommandItem onSelect={() => go("/patients/new")}>
                <UserPlus className="mr-2 h-4 w-4" /> New patient
              </CommandItem>
              <CommandItem onSelect={() => go("/appointments")}>
                <CalendarDays className="mr-2 h-4 w-4" /> Appointments
              </CommandItem>
              <CommandItem onSelect={() => go("/prescriptions")}>
                <FileText className="mr-2 h-4 w-4" /> Create prescription
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Patients">
              {patientMatches.map((patient) => (
                <CommandItem key={patient.id} onSelect={() => go(`/patients/${patient.id}`)}>
                  <span className="flex-1">
                    {patient.name}
                    <span className="ml-2 text-xs text-muted-foreground">{patient.id}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{patient.age}y</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
