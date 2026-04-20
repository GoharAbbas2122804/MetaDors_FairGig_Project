import React, { useCallback, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadCloud, FileSpreadsheet, CheckCircle2, Loader2 } from "lucide-react";
import { earningsAPI } from "../../services/api";
import { getApiErrorMessage } from "../../lib/getApiErrorMessage";

const shiftSchema = z.object({
  platform: z.string().min(1, { message: "Platform is required." }),
  date: z.string().min(1, { message: "Date is required." }),
  hours: z.coerce.number().min(0.1, { message: "Must be greater than 0." }),
  gross: z.coerce.number().min(0, { message: "Cannot be negative." }),
  deductions: z.coerce.number().min(0, { message: "Cannot be negative." }),
  screenshot: z.any().optional(),
});

export function ShiftLogger({ onShiftLogged }) {
  const [csvDragging, setCsvDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState("");
  const [csvFile, setCsvFile] = useState(null);
  const [manualStatus, setManualStatus] = useState({ type: "", message: "" });
  const [csvStatus, setCsvStatus] = useState({ type: "", message: "" });
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [isSubmittingCsv, setIsSubmittingCsv] = useState(false);
  const screenshotInputRef = useRef(null);
  const csvInputRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      platform: "",
      date: "",
      hours: "",
      gross: "",
      deductions: "",
      screenshot: undefined,
    },
  });
  const [grossValue, deductionsValue] = useWatch({
    control: form.control,
    name: ["gross", "deductions"],
  });

  const onSubmit = async (values) => {
    setIsSubmittingManual(true);
    setManualStatus({ type: "", message: "" });

    try {
      let screenshotUrl = "";
      const screenshotFile = values.screenshot?.[0];

      if (screenshotFile) {
        const evidencePayload = new FormData();
        evidencePayload.append("evidence", screenshotFile);

        const uploadResponse = await earningsAPI.post(
          "/api/earnings/upload-evidence",
          evidencePayload,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        screenshotUrl = uploadResponse.data.evidenceUrl || "";
      }

      await earningsAPI.post("/api/earnings/shift", {
        platform: values.platform,
        date: values.date,
        hours: values.hours,
        gross: values.gross,
        deductions: values.deductions,
        screenshotUrl,
      });

      setManualStatus({
        type: "success",
        message: "Shift logged successfully and saved to the database.",
      });
      form.reset();
      setUploadedFile("");
      if (screenshotInputRef.current) {
        screenshotInputRef.current.value = "";
      }
      if (typeof onShiftLogged === "function") {
        await onShiftLogged();
      }
    } catch (error) {
      setManualStatus({
        type: "error",
        message: getApiErrorMessage(error, "Unable to save this shift right now."),
      });
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    setCsvDragging(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    setCsvDragging(false);
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setCsvDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setCsvFile(file);
      setCsvStatus({ type: "", message: "" });
    }
  }, []);

  const uploadCsvFile = async (file) => {
    if (!file) {
      setCsvStatus({ type: "error", message: "Choose a CSV file first." });
      return;
    }

    setIsSubmittingCsv(true);
    setCsvStatus({ type: "", message: "" });

    try {
      const payload = new FormData();
      payload.append("file", file);

      const response = await earningsAPI.post("/api/earnings/bulk-upload", payload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setCsvStatus({
        type: "success",
        message: `${response.data.insertedCount} rows inserted, ${response.data.rejectedCount} rejected.`,
      });
      setCsvFile(null);
      if (csvInputRef.current) {
        csvInputRef.current.value = "";
      }
      if (typeof onShiftLogged === "function") {
        await onShiftLogged();
      }
    } catch (error) {
      setCsvStatus({
        type: "error",
        message: getApiErrorMessage(error, "Unable to upload the CSV right now."),
      });
    } finally {
      setIsSubmittingCsv(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Log Your Shift</CardTitle>
        <CardDescription>
          Save original shift data to the database with optional screenshot proof.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="csv">Bulk CSV Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <Form {...form}>
              {/* eslint-disable-next-line react-hooks/refs */}
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="platform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform</FormLabel>
                        <FormControl>
                          <Input placeholder="Uber, Lyft, InDrive..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours Worked</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="e.g. 5.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gross"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gross Earned ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deductions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform Deductions ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="screenshot"
                    render={({ field: { onChange, ...fieldProps } }) => (
                      <FormItem>
                        <FormLabel>Earnings Screenshot</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              ref={screenshotInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                setUploadedFile(file?.name || "");
                                onChange(event.target.files);
                              }}
                              {...fieldProps}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => screenshotInputRef.current?.click()}
                              className="flex w-full gap-2 border-dashed"
                            >
                              {uploadedFile ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <UploadCloud className="h-4 w-4" />
                              )}
                              {uploadedFile ? "Proof attached" : "Attach Proof"}
                            </Button>
                          </div>
                        </FormControl>
                        {uploadedFile ? (
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {uploadedFile}
                          </p>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                  <span className="text-sm font-medium">Net Received (Est.)</span>
                  <span className="text-lg font-bold text-primary">
                    $
                    {Math.max(
                      0,
                      Number(grossValue || 0) - Number(deductionsValue || 0)
                    ).toFixed(2)}
                  </span>
                </div>

                {manualStatus.message ? (
                  <p
                    className={`text-sm ${
                      manualStatus.type === "error" ? "text-destructive" : "text-green-600"
                    }`}
                  >
                    {manualStatus.message}
                  </p>
                ) : null}

                <Button type="submit" className="w-full" disabled={isSubmittingManual}>
                  {isSubmittingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Log Shift
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="csv">
            <div
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                csvDragging ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <FileSpreadsheet
                className={`mb-4 h-12 w-12 ${
                  csvDragging ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <h3 className="text-lg font-semibold">Drag & Drop CSV File</h3>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">
                Upload exported shift logs and store the accepted rows in the database.
              </p>
              <Input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(event) => {
                  setCsvFile(event.target.files?.[0] || null);
                  setCsvStatus({ type: "", message: "" });
                }}
              />
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button type="button" variant="secondary" onClick={() => csvInputRef.current?.click()}>
                  Browse Files
                </Button>
                <Button
                  type="button"
                  onClick={() => uploadCsvFile(csvFile)}
                  disabled={isSubmittingCsv || !csvFile}
                >
                  {isSubmittingCsv ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Upload CSV
                </Button>
              </div>
              {csvFile ? (
                <p className="mt-3 text-sm text-foreground">{csvFile.name}</p>
              ) : null}
              {csvStatus.message ? (
                <p
                  className={`mt-3 text-sm ${
                    csvStatus.type === "error" ? "text-destructive" : "text-green-600"
                  }`}
                >
                  {csvStatus.message}
                </p>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
