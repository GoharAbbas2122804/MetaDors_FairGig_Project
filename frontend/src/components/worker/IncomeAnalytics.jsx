import React from "react";
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
  Legend
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";

const mockEarningsData = [
  { week: "W1", earnings: 450, cityMedian: 400 },
  { week: "W2", earnings: 520, cityMedian: 410 },
  { week: "W3", earnings: 480, cityMedian: 415 },
  { week: "W4", earnings: 610, cityMedian: 420 },
];

const mockRatesData = [
  { date: "Mon", hourlyRate: 18, commission: 20 },
  { date: "Tue", hourlyRate: 22, commission: 20 },
  { date: "Wed", hourlyRate: 19, commission: 20 },
  { date: "Thu", hourlyRate: 25, commission: 25 },
  { date: "Fri", hourlyRate: 28, commission: 25 },
  { date: "Sat", hourlyRate: 35, commission: 30 },
  { date: "Sun", hourlyRate: 32, commission: 30 },
];

export function IncomeAnalytics() {
  const totalEarnings = mockEarningsData.reduce((acc, curr) => acc + curr.earnings, 0);
  const cityMedianTotal = mockEarningsData.reduce((acc, curr) => acc + curr.cityMedian, 0);
  const isAboveMedian = totalEarnings > cityMedianTotal;

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-primary bg-gradient-to-br from-card to-card/50 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
            Monthly Earnings Overview
            <Badge variant={isAboveMedian ? "default" : "destructive"} className="ml-2">
              {isAboveMedian ? "+ Above City Median" : "- Below City Median"}
            </Badge>
          </CardTitle>
          <div className="text-3xl font-bold tracking-tight">${totalEarnings}</div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            You earned <span className="font-semibold text-foreground">${totalEarnings - cityMedianTotal}</span> more than the city-wide median (${cityMedianTotal}) this month.
          </p>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockEarningsData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMedian" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                <Area type="monotone" name="Your Earnings" dataKey="earnings" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorEarnings)" />
                <Area type="monotone" name="City Median" dataKey="cityMedian" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorMedian)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Efficiency & Commission Tracking</CardTitle>
          <CardDescription>Monitor your effective hourly rate against platform commissions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockRatesData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} yAxisId="left" tickFormatter={(v) => `$${v}/h`} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: "12px" }} />
                <Line yAxisId="left" type="monotone" name="Hourly Rate ($)" dataKey="hourlyRate" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="step" name="Commission (%)" dataKey="commission" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
