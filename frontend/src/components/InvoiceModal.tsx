import React, { useRef } from "react";
import { Download, Mail, Printer, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Invoice } from "@/types";
import StatusBadge from "./StatusBadge";

interface InvoiceModalProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, open, onOpenChange }) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!invoice) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    const windowPrint = window.open('', '', 'width=900,height=650');
    if (windowPrint && printContent) {
      windowPrint.document.write(`
        <html>
          <head>
            <title>Invoice ${invoice.id}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #333; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; }
              .logo { font-size: 24px; font-weight: bold; color: #0f172a; }
              .invoice-info { text-align: right; }
              .details { margin-top: 40px; display: flex; justify-content: space-between; }
              table { width: 100%; border-collapse: collapse; margin-top: 40px; }
              th { text-align: left; border-bottom: 2px solid #eee; padding: 10px; font-size: 14px; color: #666; }
              td { padding: 15px 10px; border-bottom: 1px solid #eee; font-size: 14px; }
              .total-section { margin-top: 30px; text-align: right; }
              .total-row { display: flex; justify-content: flex-end; gap: 40px; margin-top: 10px; }
              .grand-total { font-size: 20px; font-weight: bold; color: #000; }
              .footer { margin-top: 60px; font-size: 12px; color: #999; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">Siara Dental Clinic</div>
              <div class="invoice-info">
                <div style="font-size: 18px; font-weight: bold;">INVOICE</div>
                <div>#${invoice.id}</div>
                <div>Date: ${invoice.date}</div>
              </div>
            </div>
            <div class="details">
              <div>
                <div style="color: #666; font-size: 12px; margin-bottom: 5px;">BILL TO</div>
                <div style="font-weight: bold;">${invoice.patientName}</div>
                <div>Patient ID: ${invoice.patientId}</div>
              </div>
              <div style="text-align: right;">
                <div style="color: #666; font-size: 12px; margin-bottom: 5px;">PAYMENT STATUS</div>
                <div style="font-weight: bold;">${invoice.status.toUpperCase()}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Tooth #</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items.map(item => `
                  <tr>
                    <td>${item.description}</td>
                    <td>${item.toothNumber || '-'}</td>
                    <td style="text-align: right;">Rs ${item.amount.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total-section">
              <div class="total-row">
                <span>Subtotal</span>
                <span>Rs ${invoice.total.toLocaleString()}</span>
              </div>
              <div class="total-row">
                <span>Tax (0%)</span>
                <span>Rs 0</span>
              </div>
              <div class="total-row grand-total">
                <span>Total Amount</span>
                <span>Rs ${invoice.total.toLocaleString()}</span>
              </div>
            </div>
            <div class="footer">
              <p>Thank you for choosing Siara Dental Clinic. Please contact us if you have any questions about this invoice.</p>
              <p>123 Medical Plaza, Bangalore · +91 80 1234 5678 · billing@siaradental.com</p>
            </div>
          </body>
        </html>
      `);
      windowPrint.document.close();
      windowPrint.focus();
      windowPrint.print();
      windowPrint.close();
    }
  };

  const handleSend = () => {
    toast.promise(new Promise(resolve => setTimeout(resolve, 1500)), {
      loading: 'Sending invoice to patient...',
      success: `Invoice #${invoice.id} has been sent to the patient's email.`,
      error: 'Failed to send invoice.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border/50 bg-secondary/15 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-heading">Invoice Details</DialogTitle>
                <p className="text-sm text-muted-foreground">Manage and export patient bill</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="mr-1.5 h-4 w-4" /> Print
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Download className="mr-1.5 h-4 w-4" /> PDF
              </Button>
              <Button size="sm" onClick={handleSend}>
                <Mail className="mr-1.5 h-4 w-4" /> Send to Patient
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8" ref={printRef}>
          <div className="flex justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Siara Dental Clinic</h2>
              <p className="text-sm text-muted-foreground mt-1">Specialized Oral Health Center</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-heading font-bold text-primary">INVOICE</div>
              <p className="text-sm font-medium">#{invoice.id}</p>
              <p className="text-sm text-muted-foreground">{invoice.date}</p>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-8 rounded-lg bg-secondary/20 p-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bill To</p>
              <p className="mt-1 text-lg font-bold">{invoice.patientName}</p>
              <p className="text-sm text-muted-foreground">ID: {invoice.patientId}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
              <div className="mt-2 flex justify-end">
                <StatusBadge status={invoice.status} />
              </div>
            </div>
          </div>

          <table className="mt-10 w-full border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pl-2">Description</th>
                <th className="pb-3 text-center">Tooth #</th>
                <th className="pb-3 pr-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td className="py-4 pl-2 text-sm font-medium">{item.description}</td>
                  <td className="py-4 text-center text-sm text-muted-foreground">{item.toothNumber || "-"}</td>
                  <td className="py-4 pr-2 text-right text-sm font-bold">Rs {item.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 flex justify-end">
            <div className="w-full max-w-[240px] space-y-2 border-t-2 border-primary pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">Rs {invoice.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (0%)</span>
                <span className="font-medium">Rs 0</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-lg font-bold">
                <span>Total Amount</span>
                <span className="text-primary">Rs {invoice.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center text-[10px] text-muted-foreground italic">
            Thank you for choosing Siara Dental. Your oral health is our priority.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceModal;
