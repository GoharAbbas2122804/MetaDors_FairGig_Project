import React, { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadCloud, FileSpreadsheet, CheckCircle2 } from "lucide-react";

const shiftSchema = z.object({
  platform: z.string().min(1, { message: "Platform is required." }),
  date: z.string().min(1, { message: "Date is required." }),
  hours: z.coerce.number().min(0.1, { message: "Must be greater than 0." }),
  gross: z.coerce.number().min(0, { message: "Cannot be negative." }),
  deductions: z.coerce.number().min(0, { message: "Cannot be negative." }),
  screenshot: z.any().optional(),
});

export function ShiftLogger() {
  const [csvDragging, setCsvDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

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

  const onSubmit = (values) => {
    // Calculate net received conceptually
    const netReceived = values.gross - values.deductions;
    console.log("Logged shift:", { ...values, netReceived });
    form.reset();
    setUploadedFile(null);
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setCsvDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setCsvDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setCsvDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      console.log("Dropped CSV file:", e.dataTransfer.files[0]);
      // Process CSV locally here
    }
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0].name);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Log Your Shift</CardTitle>
        <CardDescription>Manually enter shift details or bulk upload a CSV.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="csv">Bulk CSV Upload</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="platform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="uber">Uber</SelectItem>
                            <SelectItem value="lyft">Lyft</SelectItem>
                            <SelectItem value="doordash">DoorDash</SelectItem>
                            <SelectItem value="instacart">Instacart</SelectItem>
                          </SelectContent>
                        </Select>
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
                          <Input type="number" step="0.1" placeholder="e.g., 5.5" {...field} />
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
                  
                  {/* File Upload for Screenshot */}
                  <FormField
                    control={form.control}
                    name="screenshot"
                    render={({ field: { value, onChange, ...fieldProps } }) => (
                      <FormItem>
                        <FormLabel>Earnings Screenshot</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id="screenshot-upload"
                              onChange={(e) => {
                                handleFileChange(e);
                                onChange(e.target.files);
                              }}
                              {...fieldProps}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById("screenshot-upload").click()}
                              className="w-full border-dashed flex gap-2"
                            >
                              {uploadedFile ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <UploadCloud className="w-4 h-4" />}
                              {uploadedFile ? "Uploaded" : "Attach Proof"}
                            </Button>
                          </div>
                        </FormControl>
                        {uploadedFile && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">{uploadedFile}</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="bg-muted px-4 py-3 rounded-lg flex justify-between items-center mt-2">
                  <span className="text-sm font-medium">Net Received (Est.):</span>
                  <span className="text-lg font-bold text-primary">
                    ${Math.max(0, (form.watch("gross") || 0) - (form.watch("deductions") || 0)).toFixed(2)}
                  </span>
                </div>

                <Button type="submit" className="w-full">Log Shift</Button>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="csv">
            <div
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors ${
                csvDragging ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className={`w-12 h-12 mb-4 ${csvDragging ? "text-primary" : "text-muted-foreground"}`} />
              <h3 className="text-lg font-semibold">Drag & Drop CSV File</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Upload bulk shifts exported from platform apps.
              </p>
              <Input
                type="file"
                accept=".csv"
                className="hidden"
                id="csv-upload"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                     console.log("Selected CSV file:", e.target.files[0]);
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={() => document.getElementById("csv-upload").click()}>
                Browse Files
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
