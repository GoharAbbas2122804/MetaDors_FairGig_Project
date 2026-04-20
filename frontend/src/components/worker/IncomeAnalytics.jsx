import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function IncomeAnalytics({ monthly, dailyTrend = [] }) {
  const chartData = useMemo(
    () =>
      dailyTrend.map((entry) => ({
        ...entry,
        label: formatShortDate(entry.date),
      })),
    [dailyTrend]
  );

  const hasMonthlyData = (monthly?.shiftCount || 0) > 0;

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-primary bg-gradient-to-br from-card to-card/50 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            Monthly Earnings Overview
            <Badge variant={hasMonthlyData ? "default" : "secondary"} className="ml-2">
              {hasMonthlyData ? `${monthly.shiftCount} shifts this month` : "No shifts yet"}
            </Badge>
          </CardTitle>
          <div className="text-3xl font-bold tracking-tight">
            {formatCurrency(monthly?.net)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Gross</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(monthly?.gross)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Commission</p>
              <p className="mt-1 text-lg font-semibold">
                {monthly?.averageCommissionRate?.toFixed?.(2) || "0.00"}%
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Hours</p>
              <p className="mt-1 text-lg font-semibold">{monthly?.hours || 0}</p>
            </div>
          </div>

          <div className="h-[220px] w-full">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(value), name]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                  <Area
                    type="monotone"
                    name="Net Earnings"
                    dataKey="net"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorNet)"
                  />
                  <Area
                    type="monotone"
                    name="Gross Earnings"
                    dataKey="gross"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorGross)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                Monthly earnings will appear here after your first logged shift.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Efficiency & Commission Tracking</CardTitle>
          <CardDescription>
            Effective hourly earnings and commission rate are calculated from your
            real monthly shift logs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Net</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(monthly?.net)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Deductions</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(monthly?.deductions)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg Hourly</p>
              <p className="mt-1 text-lg font-semibold">
                {formatCurrency(monthly?.averageHourlyRate)}
              </p>
            </div>
          </div>

          <div className="h-[250px] w-full">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    yAxisId="left"
                    tickFormatter={(value) => `$${value}/h`}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "Commission (%)"
                        ? `${Number(value).toFixed(2)}%`
                        : formatCurrency(value),
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend iconType="plainline" wrapperStyle={{ fontSize: "12px" }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    name="Hourly Rate ($)"
                    dataKey="hourlyRate"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    name="Commission (%)"
                    dataKey="commissionRate"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                Commission tracking will appear after shifts are saved to the database.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
