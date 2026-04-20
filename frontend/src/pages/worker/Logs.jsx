import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { earningsAPI } from "@/services/api";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function getStatusVariant(status) {
  if (status === "confirmed") return "default";
  if (status === "flagged") return "destructive";
  if (status === "unverifiable") return "secondary";
  return "outline";
}

const WorkerLogs = () => {
  const [shifts, setShifts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadShifts = async () => {
      try {
        const response = await earningsAPI.get("/api/earnings/shifts");
        setShifts(response.data?.shifts || []);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, "Unable to load your shift history."));
      } finally {
        setIsLoading(false);
      }
    };

    loadShifts();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl font-bold tracking-tight">Activity Logs</CardTitle>
        <CardDescription>
          Original shift records fetched directly from the database for this worker.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex min-h-[260px] items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading your shift records...
          </div>
        ) : null}

        {!isLoading && error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!isLoading && !error ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shift ID</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Tracking</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.length ? (
                shifts.map((shift) => (
                  <TableRow key={shift._id}>
                    <TableCell className="font-medium">{shift._id}</TableCell>
                    <TableCell>{shift.platform}</TableCell>
                    <TableCell>{dateFormatter.format(new Date(shift.date || shift.createdAt))}</TableCell>
                    <TableCell>{Number(shift.hours || 0).toFixed(2)}</TableCell>
                    <TableCell>{formatCurrency(shift.gross)}</TableCell>
                    <TableCell>{formatCurrency(shift.deductions)}</TableCell>
                    <TableCell>{formatCurrency(shift.net)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(shift.verificationStatus)}>
                        {shift.verificationStatus || "pending"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    No shifts have been logged yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default WorkerLogs;
