import React from "react";
import { Download, Printer, Receipt, X } from "lucide-react";

import type { Invoice, Patient } from "@/types";
import { pdfService } from "@/lib/pdfService";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/StatusBadge";

interface InvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  patient?: Patient | null;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({
  open,
  onOpenChange,
  invoice,
  patient,
}) => {
  if (!invoice) return null;

  const balance = Math.max(Number(invoice.total || 0) - Number(invoice.paidAmount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-[30px] border-white/60 bg-white/95 p-0 shadow-[0_20px_60px_rgba(26,18,14,0.16)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-secondary/50 via-white to-secondary/30 px-6 py-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="font-heading text-3xl font-semibold">
              Invoice preview
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Premium billing sheet ready for print or export
            </p>
          </DialogHeader>

          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-6 py-6">
          <div className="rounded-[32px] border border-border/60 bg-gradient-to-br from-white to-secondary/10 p-8 shadow-sm">
            <div className="flex flex-col gap-5 border-b border-border/60 pb-6 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Dental invoice
                </p>
                <h2 className="mt-2 font-heading text-3xl font-semibold text-foreground">
                  Siara Dental
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Elegant billing summary for clinical services
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                <Receipt className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-border/60 bg-white/80 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Bill to</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {patient?.name || invoice.patientName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  ID {invoice.patientId}
                </p>
                {patient?.phone ? (
                  <p className="text-sm text-muted-foreground">{patient.phone}</p>
                ) : null}
                {patient?.email ? (
                  <p className="text-sm text-muted-foreground">{patient.email}</p>
                ) : null}
              </div>

              <div className="rounded-[24px] border border-border/60 bg-white/80 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Invoice details
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{invoice.id}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{invoice.date}</p>
                  </div>
                  <StatusBadge status={invoice.status} />
                </div>
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-[24px] border border-border/60">
              <table className="w-full border-collapse">
                <thead className="bg-secondary/15">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="px-5 py-4">Description</th>
                    <th className="px-5 py-4 text-center">Tooth</th>
                    <th className="px-5 py-4 text-right">Amount</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/60 bg-white/80">
                  {invoice.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-5 py-4 text-sm font-medium text-foreground">
                        {item.description}
                      </td>
                      <td className="px-5 py-4 text-center text-sm text-muted-foreground">
                        {item.toothNumber || "-"}
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-semibold text-foreground">
                        ₹{Number(item.amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex justify-end">
              <div className="w-full max-w-[280px] rounded-[24px] border border-border/60 bg-white/85 p-5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">
                    ₹{Number(invoice.total || 0).toLocaleString()}
                  </span>
                </div>

                <div className="mt-3 flex justify-between text-sm">
                  <span className="font-medium text-emerald-600">Amount paid</span>
                  <span className="font-semibold text-emerald-600">
                    ₹{Number(invoice.paidAmount || 0).toLocaleString()}
                  </span>
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between text-lg font-semibold">
                  <span className="text-foreground">Balance due</span>
                  <span className="text-primary">₹{balance.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-10 text-center text-[11px] italic text-muted-foreground">
              Thank you for choosing Siara Dental. Your oral health is our priority.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 px-6 py-4">
          <Button
            variant="outline"
            onClick={() => {
              if (!patient) return;
              pdfService.generateInvoicePDF(patient, invoice as any);
            }}
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>

          <Button
            onClick={() => {
              if (!patient) return;
              pdfService.generateInvoicePDF(patient, invoice as any);
            }}
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceModal;