import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BadgeDollarSign, ClipboardList, Loader2, Users } from "lucide-react";
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

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function deriveTrackingStatus(summary = {}) {
  if (summary.flagged > 0) return "Flagged";
  if (summary.pending > 0) return "Pending";
  if (summary.unverifiable > 0) return "Unverifiable";
  if (summary.confirmed > 0) return "Verified";
  return "No logs";
}

function getBadgeVariant(status) {
  if (status === "Flagged") return "destructive";
  if (status === "Pending") return "outline";
  if (status === "Unverifiable") return "secondary";
  if (status === "Verified") return "default";
  return "secondary";
}

function StatCard({ title, value, description, icon: Icon }) {
  const StatIcon = Icon;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">{value}</div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <StatIcon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

const AdvocateDashboard = () => {
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadWorkers = async () => {
      try {
        const response = await earningsAPI.get("/api/earnings/workers/overview");
        setWorkers(response.data?.workers || []);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, "Unable to load worker overview data."));
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void loadWorkers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const totals = useMemo(() => {
    return workers.reduce(
      (accumulator, item) => {
        accumulator.workerCount += 1;
        accumulator.monthlyNet += Number(item.metrics?.currentMonth?.net || 0);
        accumulator.totalLogs += Number(item.metrics?.allTimeShiftCount || 0);
        accumulator.flaggedWorkers += item.metrics?.verificationSummary?.flagged > 0 ? 1 : 0;
        return accumulator;
      },
      {
        workerCount: 0,
        monthlyNet: 0,
        totalLogs: 0,
        flaggedWorkers: 0,
      }
    );
  }, [workers]);

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Advocate Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Exact worker records from the database, including ID, name, monthly earnings, commission, and verification tracking.
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex min-h-[260px] items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading worker overview...
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && error ? (
        <Card>
          <CardContent className="py-8 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {!isLoading && !error ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Workers Covered"
              value={totals.workerCount}
              description="Worker profiles included in the current overview"
              icon={Users}
            />
            <StatCard
              title="Monthly Net Earnings"
              value={formatCurrency(totals.monthlyNet)}
              description="Combined current-month worker earnings"
              icon={BadgeDollarSign}
            />
            <StatCard
              title="Tracked Shift Logs"
              value={totals.totalLogs}
              description="All-time shift records across workers"
              icon={ClipboardList}
            />
            <StatCard
              title="Flagged Workers"
              value={totals.flaggedWorkers}
              description="Workers with at least one flagged shift"
              icon={AlertTriangle}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Worker Earnings and Tracking Overview</CardTitle>
              <CardDescription>
                Each row is built from the `User` schema and aggregated `Shift` data for the current month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead className="text-right">Monthly Earnings</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Monthly Logs</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Latest Shift</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.length ? (
                    workers.map((item) => {
                      const trackingStatus = deriveTrackingStatus(item.metrics?.verificationSummary);
                      return (
                        <TableRow key={item.worker?._id}>
                          <TableCell className="font-medium">{item.worker?._id}</TableCell>
                          <TableCell>{item.worker?.fullName}</TableCell>
                          <TableCell>{item.worker?.demographics?.cityZone || "Not provided"}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.metrics?.currentMonth?.net)}</TableCell>
                          <TableCell className="text-right">{formatPercent(item.metrics?.currentMonth?.averageCommissionRate)}</TableCell>
                          <TableCell className="text-right">{item.metrics?.currentMonth?.shiftCount || 0}</TableCell>
                          <TableCell>
                            <Badge variant={getBadgeVariant(trackingStatus)}>{trackingStatus}</Badge>
                          </TableCell>
                          <TableCell>
                            {item.metrics?.latestShiftDate
                              ? dateFormatter.format(new Date(item.metrics.latestShiftDate))
                              : "No shifts yet"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                        No worker records are available yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
};

export default AdvocateDashboard;
