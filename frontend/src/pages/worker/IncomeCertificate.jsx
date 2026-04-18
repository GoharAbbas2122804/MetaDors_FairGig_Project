import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Printer, ShieldCheck } from "lucide-react";

export default function IncomeCertificate() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:m-0 print:p-0 print:w-full print:max-w-none">
      {/* UI Header - Hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Income Certificate</h1>
          <p className="text-muted-foreground mt-1">Generate a verified proof of earnings statement for landlords or banks.</p>
        </div>
        <Button onClick={handlePrint} className="flex gap-2 items-center">
          <Printer className="w-4 h-4" />
          Print / Save PDF
        </Button>
      </div>

      {/* Certificate Container */}
      <Card className="print:shadow-none print:border-none print:bg-white print:text-black">
        <CardContent className="p-10 md:p-14 print:p-0">
          {/* Official Document Header */}
          <div className="flex justify-between items-start border-b-2 border-primary/20 print:border-black pb-8 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary text-primary-foreground print:bg-black rounded-lg flex items-center justify-center font-bold text-xl print:text-white print:border-2 print:border-black shrink-0">
                FG
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-foreground print:text-black">FairGig Validation</h2>
                <p className="text-sm text-muted-foreground print:text-gray-600 font-mono">ID: CERT-89X-4042M</p>
              </div>
            </div>
            <div className="text-right">
              <h3 className="font-bold text-lg print:text-black mb-1">Official Proof of Earnings</h3>
              <p className="text-sm text-muted-foreground print:text-gray-600">Issued: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Worker Details */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground print:text-gray-500 mb-2">Worker Information</h4>
              <p className="font-medium text-lg print:text-black">Jane Doe</p>
              <p className="text-sm text-muted-foreground print:text-black">FG ID: FG-X492A</p>
              <div className="inline-flex items-center gap-1.5 mt-2 bg-green-100 text-green-800 print:bg-transparent print:text-black print:border print:border-gray-300 px-2.5 py-1 rounded-full text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Identity Verified
              </div>
            </div>
            <div className="text-right">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground print:text-gray-500 mb-2">Coverage Period</h4>
              <p className="font-medium print:text-black">January 01, 2024 - March 31, 2024</p>
              <p className="text-sm text-muted-foreground print:text-black">3 Months Duration</p>
            </div>
          </div>

          {/* Earnings Table */}
          <div className="mb-10">
            <h4 className="text-lg font-bold border-b border-border print:border-black/30 pb-2 mb-4 print:text-black">Verified Earnings Summary</h4>
            <div className="w-full border rounded-lg overflow-hidden print:border-black">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted print:bg-gray-100 border-b print:border-black/50 text-muted-foreground print:text-black">
                  <tr>
                    <th className="px-4 py-3 font-medium">Platform</th>
                    <th className="px-4 py-3 font-medium">Total Shifts</th>
                    <th className="px-4 py-3 font-medium">Gross Earned</th>
                    <th className="px-4 py-3 font-medium text-right">Net Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border print:divide-black/20">
                  <tr className="print:text-black">
                    <td className="px-4 py-3 font-medium">Uber</td>
                    <td className="px-4 py-3">48</td>
                    <td className="px-4 py-3">$2,450.00</td>
                    <td className="px-4 py-3 text-right font-mono">$1,920.50</td>
                  </tr>
                  <tr className="print:text-black">
                    <td className="px-4 py-3 font-medium">DoorDash</td>
                    <td className="px-4 py-3">62</td>
                    <td className="px-4 py-3">$1,890.00</td>
                    <td className="px-4 py-3 text-right font-mono">$1,510.25</td>
                  </tr>
                  <tr className="print:text-black">
                    <td className="px-4 py-3 font-medium">Instacart</td>
                    <td className="px-4 py-3">14</td>
                    <td className="px-4 py-3">$640.00</td>
                    <td className="px-4 py-3 text-right font-mono">$580.00</td>
                  </tr>
                </tbody>
                <tfoot className="bg-primary/5 print:bg-transparent border-t-2 border-border print:border-black/50">
                  <tr className="font-bold print:text-black">
                    <td className="px-4 py-4" colSpan={2}>Aggregate Total</td>
                    <td className="px-4 py-4 text-lg">$4,980.00</td>
                    <td className="px-4 py-4 text-right text-lg text-primary print:text-black">$4,010.75</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Footer Text */}
          <div className="pt-8 border-t border-border print:border-black/20 text-xs text-muted-foreground print:text-gray-600 print:text-justify max-w-3xl">
            <p className="mb-2"><strong>Disclaimer:</strong> This certificate is generated computationally based on shift logs voluntarily provided and cross-matched through the FairGig anomaly detection framework. FairGig acts as a neutral verification layer and does not guarantee the permanence of future incomes.</p>
            <p>For inquiries or to mathematically verify this certificate's cryptographic hash, landlords and financial institutions may visit <strong>verify.fairgig.app</strong> and enter the Certificate ID located at the top of this document.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
