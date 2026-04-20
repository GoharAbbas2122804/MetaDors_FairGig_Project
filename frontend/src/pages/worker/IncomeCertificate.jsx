import React, { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Printer, RefreshCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { certificateAPI, earningsAPI, serviceBaseUrls } from "@/services/api";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { useAuth } from "@/context/AuthContext";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "2-digit",
  year: "numeric",
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatDisplayDate(value) {
  return longDateFormatter.format(new Date(value));
}

function toInputDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

export default function IncomeCertificate() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [certificate, setCertificate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const workerId = user?._id || "";

  const loadInitialCertificate = async () => {
    if (!workerId) {
      return;
    }

    try {
      setError("");
      const shiftsResponse = await earningsAPI.get("/api/earnings/shifts");
      const confirmedShifts = (shiftsResponse.data?.shifts || []).filter(
        (shift) => shift.verificationStatus === "confirmed"
      );

      if (!confirmedShifts.length) {
        setCertificate(null);
        setDateRange({
          startDate: toInputDate(new Date()),
          endDate: toInputDate(new Date()),
        });
        return;
      }

      const sortedShifts = [...confirmedShifts].sort(
        (first, second) => new Date(first.date) - new Date(second.date)
      );

      const initialRange = {
        startDate: toInputDate(sortedShifts[0].date),
        endDate: toInputDate(sortedShifts[sortedShifts.length - 1].date),
      };

      setDateRange(initialRange);
      const response = await certificateAPI.get(
        `/generate-certificate/${workerId}`,
        {
          params: {
            ...initialRange,
            format: "json",
          },
        }
      );

      setCertificate(response.data);
    } catch (loadError) {
      setError(
        getApiErrorMessage(loadError, "Unable to load certificate data right now.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadInitialCertificate();
  }, [workerId]);

  const handleGenerate = async () => {
    if (!workerId || !dateRange.startDate || !dateRange.endDate) {
      return;
    }

    try {
      setIsGenerating(true);
      setError("");
      const response = await certificateAPI.get(
        `/generate-certificate/${workerId}`,
        {
          params: {
            ...dateRange,
            format: "json",
          },
        }
      );
      setCertificate(response.data);
    } catch (loadError) {
      setError(
        getApiErrorMessage(loadError, "Unable to generate the certificate for this range.")
      );
      setCertificate(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const certificateLinks = useMemo(() => {
    if (!workerId || !dateRange.startDate || !dateRange.endDate) {
      return { html: "", pdf: "" };
    }

    const params = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });

    return {
      html: `${serviceBaseUrls.certificate}/generate-certificate/${workerId}?${params.toString()}`,
      pdf: `${serviceBaseUrls.certificate}/generate-certificate/${workerId}?${params.toString()}&format=pdf`,
    };
  }, [dateRange.endDate, dateRange.startDate, workerId]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Income Certificate</h1>
        <p className="text-muted-foreground">
          Generate a live certificate from confirmed shift records stored in the database.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Certificate Controls</CardTitle>
          <CardDescription>
            Select a date range, preview the verified totals, then open the HTML or PDF certificate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium">
              Start Date
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(event) =>
                  setDateRange((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
                className="mt-1"
              />
            </label>
            <label className="text-sm font-medium">
              End Date
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(event) =>
                  setDateRange((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }))
                }
                className="mt-1"
              />
            </label>
            <div className="flex items-end">
              <Button onClick={handleGenerate} disabled={isGenerating || !workerId} className="w-full">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Generate Preview
              </Button>
            </div>
            <div className="flex items-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={!certificate}
                onClick={() => window.open(certificateLinks.html, "_blank", "noopener,noreferrer")}
              >
                <FileText className="h-4 w-4" />
                HTML
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={!certificate}
                onClick={() => window.open(certificateLinks.pdf, "_blank", "noopener,noreferrer")}
              >
                <Printer className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex min-h-[240px] items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading confirmed earnings data...
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !certificate && !error ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No confirmed shifts were found for certificate generation yet.
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && certificate ? (
        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="grid gap-6 p-6 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Certificate ID</p>
                <p className="mt-1 font-semibold">{certificate.certificateId}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Worker</p>
                <p className="mt-1 font-semibold">{certificate.worker?.fullName || user?.fullName}</p>
                <p className="text-sm text-muted-foreground">{certificate.workerId}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Coverage</p>
                <p className="mt-1 font-semibold">
                  {formatDisplayDate(certificate.startDate)} - {formatDisplayDate(certificate.endDate)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Verification</p>
                <Badge className="mt-1">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                  Confirmed Shifts Only
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Net</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatCurrency(certificate.totals?.net)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Gross</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatCurrency(certificate.totals?.gross)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Deductions</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatCurrency(certificate.totals?.deductions)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Confirmed Shifts</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {certificate.totals?.totalShifts || 0}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verified Earnings Summary</CardTitle>
              <CardDescription>
                Platform totals fetched from confirmed shifts in the certificate service.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Total Shifts</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificate.perPlatform.map((row) => (
                    <TableRow key={row.platform}>
                      <TableCell className="font-medium">{row.platform}</TableCell>
                      <TableCell>{row.totalShifts}</TableCell>
                      <TableCell>{Number(row.hours || 0).toFixed(2)}</TableCell>
                      <TableCell>{formatCurrency(row.gross)}</TableCell>
                      <TableCell>{formatCurrency(row.deductions)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.net)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
