import React, { useMemo, useState, useEffect } from "react";
import {
  AlertTriangle,
  BadgeAlert,
  CircleCheckBig,
  Clock3,
  Layers3,
  ShieldAlert,
  TrendingDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  BarChart,
  Bar,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const commissionTrendData = [
  { month: "May", platformA: 18.2, platformB: 19.1 },
  { month: "Jun", platformA: 18.4, platformB: 19.4 },
  { month: "Jul", platformA: 18.7, platformB: 19.6 },
  { month: "Aug", platformA: 18.9, platformB: 19.9 },
  { month: "Sep", platformA: 19.1, platformB: 20.4 },
  { month: "Oct", platformA: 19.4, platformB: 20.1 },
  { month: "Nov", platformA: 19.6, platformB: 20.3 },
  { month: "Dec", platformA: 19.8, platformB: 20.8 },
  { month: "Jan", platformA: 20.1, platformB: 21.0 },
  { month: "Feb", platformA: 20.5, platformB: 21.2 },
  { month: "Mar", platformA: 20.6, platformB: 21.5 },
  { month: "Apr", platformA: 20.9, platformB: 21.8 },
];

const zonalVolatilityData = [
  { zone: "North Zone", avgIncome: 1140, volatility: 22 },
  { zone: "South Zone", avgIncome: 980, volatility: 28 },
  { zone: "East Zone", avgIncome: 1020, volatility: 17 },
  { zone: "West Zone", avgIncome: 1090, volatility: 25 },
  { zone: "Central Zone", avgIncome: 1265, volatility: 14 },
  { zone: "Harbor Zone", avgIncome: 920, volatility: 31 },
];

const vulnerabilityWatchlistData = [
  { workerId: "WG-3A9X", platform: "Platform A", previousAvg: 1180, currentAvg: 890, dropPercent: 24.6 },
  { workerId: "WG-9T2L", platform: "Platform B", previousAvg: 1045, currentAvg: 780, dropPercent: 25.4 },
  { workerId: "WG-7Q4R", platform: "Platform A", previousAvg: 1330, currentAvg: 1012, dropPercent: 23.9 },
  { workerId: "WG-5M8C", platform: "Platform B", previousAvg: 920, currentAvg: 690, dropPercent: 25.0 },
  { workerId: "WG-2K6N", platform: "Platform A", previousAvg: 1085, currentAvg: 812, dropPercent: 25.2 },
  { workerId: "WG-8P1F", platform: "Platform B", previousAvg: 970, currentAvg: 755, dropPercent: 22.2 },
  { workerId: "WG-1D3H", platform: "Platform A", previousAvg: 1215, currentAvg: 905, dropPercent: 25.5 },
];

const complaintTags = [
  "Income Suppression",
  "Payout Delay",
  "Unsafe Assignment",
  "Algorithmic Bias",
  "Deactivation Review",
  "Fraud Escalation",
];

const grievanceFeedData = [
  {
    id: "cmp-101",
    workerId: "WG-1A2B",
    platform: "Platform A",
    category: "Unpaid Fares",
    description: "Three completed rides from the night shift are marked as cancelled and no payout was released.",
    status: "Open",
    tags: ["Payout Delay"],
  },
  {
    id: "cmp-102",
    workerId: "WG-8C1D",
    platform: "Platform B",
    category: "Unjust Deactivations",
    description: "Account was auto-deactivated after two customer reports without any manual investigation or appeal link.",
    status: "Escalated",
    tags: ["Deactivation Review", "Algorithmic Bias"],
  },
  {
    id: "cmp-103",
    workerId: "WG-4E6F",
    platform: "Platform A",
    category: "Unpaid Fares",
    description: "Weekly settlement did not include peak-hour surge multipliers even though logs show they were active.",
    status: "Open",
    tags: ["Income Suppression"],
  },
  {
    id: "cmp-104",
    workerId: "WG-7G9H",
    platform: "Platform B",
    category: "Safety Concern",
    description: "Repeated late-night assignments in high-risk blocks despite opting out in availability preferences.",
    status: "Resolved",
    tags: ["Unsafe Assignment"],
  },
  {
    id: "cmp-105",
    workerId: "WG-0I3J",
    platform: "Platform A",
    category: "Unjust Deactivations",
    description: "Deactivation notice references fraud pattern but provides no ride IDs, timestamps, or supporting records.",
    status: "Open",
    tags: ["Deactivation Review", "Fraud Escalation"],
  },
  {
    id: "cmp-106",
    workerId: "WG-4K8L",
    platform: "Platform B",
    category: "Rating Manipulation",
    description: "Ratings dropped sharply after refusing out-of-route requests; requests for review remain unanswered.",
    status: "Escalated",
    tags: ["Algorithmic Bias"],
  },
];

const statusFlow = ["Open", "Escalated", "Resolved"];

const formatCurrency = (value) => `$${value.toLocaleString()}`;

const LoadingSkeleton = ({ className }) => (
  <div className={`animate-pulse rounded-md bg-muted/70 ${className}`} />
);

const TagPicker = ({ selectedTags, onToggleTag }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((prev) => !prev)}>
        Tags
      </Button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border bg-popover p-3 shadow-lg">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Select issue tags</div>
          <div className="space-y-2">
            {complaintTags.map((tag) => (
              <label key={tag} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={selectedTags.includes(tag)}
                  onChange={() => onToggleTag(tag)}
                />
                {tag}
              </label>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, intent = "default" }) => {
  const alertStyle = intent === "alert" ? "text-red-600 dark:text-red-400" : "text-primary";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="text-2xl font-semibold">{value}</div>
        <Icon className={`h-5 w-5 ${alertStyle}`} />
      </CardContent>
    </Card>
  );
};

const AdvocateDashboard = ({ initialSection = "overview" }) => {
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(initialSection);
  const [complaints, setComplaints] = useState([]);
  const [selectedComplaintIds, setSelectedComplaintIds] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setComplaints(grievanceFeedData);
      setLoading(false);
    }, 1100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  const topCategories = useMemo(() => {
    const counts = complaints.reduce((acc, complaint) => {
      acc[complaint.category] = (acc[complaint.category] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);
  }, [complaints]);

  const deactivationComplaints = useMemo(
    () => complaints.filter((item) => item.category === "Unjust Deactivations").length,
    [complaints]
  );

  const selectComplaint = (id) => {
    setSelectedComplaintIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const moveComplaintStatus = (id, nextStatus) => {
    setComplaints((prev) => prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item)));
  };

  const toggleTag = (id, tag) => {
    setComplaints((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const alreadyTagged = item.tags.includes(tag);
        const tags = alreadyTagged ? item.tags.filter((x) => x !== tag) : [...item.tags, tag];
        return { ...item, tags };
      })
    );
  };

  const clusterSelected = () => {
    setComplaints((prev) =>
      prev.map((item) =>
        selectedComplaintIds.includes(item.id) ? { ...item, status: "Escalated", tags: [...new Set([...item.tags, "Clustered"]) ] } : item
      )
    );
    setSelectedComplaintIds([]);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Advocate / Analyst Command Center</h1>
          <p className="text-sm text-muted-foreground">
            Platform-level labor intelligence, vulnerability tracking, and grievance moderation.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card p-1">
          <Button
            variant={activeSection === "overview" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveSection("overview")}
          >
            Analytics
          </Button>
          <Button
            variant={activeSection === "moderation" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveSection("moderation")}
          >
            Moderation
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <LoadingSkeleton className="h-72" />
            <LoadingSkeleton className="h-72" />
          </div>
          <LoadingSkeleton className="h-64" />
        </div>
      ) : null}

      {!loading && activeSection === "overview" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Commission Rate Tracker</CardTitle>
                <CardDescription>Average commission rates over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={commissionTrendData}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                    <XAxis dataKey="month" />
                    <YAxis domain={[17, 23]} tickFormatter={(value) => `${value}%`} />
                    <Tooltip formatter={(value) => [`${value}%`, "Commission"]} />
                    <Legend />
                    <Line type="monotone" dataKey="platformA" stroke="#2563eb" strokeWidth={2.5} name="Platform A" dot={false} />
                    <Line type="monotone" dataKey="platformB" stroke="#16a34a" strokeWidth={2.5} name="Platform B" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Zonal Volatility Chart</CardTitle>
                <CardDescription>Income distribution and volatility by city zone</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={zonalVolatilityData}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                    <XAxis dataKey="zone" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="avgIncome" fill="#6366f1" radius={[6, 6, 0, 0]} name="Avg Income ($)" />
                    <Bar yAxisId="right" dataKey="volatility" fill="#f97316" radius={[6, 6, 0, 0]} name="Volatility (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                Vulnerability Watchlist
              </CardTitle>
              <CardDescription>Workers with month-on-month income drops above 20%</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Anonymized Worker ID</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Previous Month Avg</TableHead>
                    <TableHead>Current Month Avg</TableHead>
                    <TableHead>% Drop</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vulnerabilityWatchlistData.map((worker) => (
                    <TableRow key={worker.workerId}>
                      <TableCell className="font-medium">{worker.workerId}</TableCell>
                      <TableCell>{worker.platform}</TableCell>
                      <TableCell>{formatCurrency(worker.previousAvg)}</TableCell>
                      <TableCell>{formatCurrency(worker.currentAvg)}</TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="gap-1">
                          <TrendingDown className="h-3.5 w-3.5" />
                          {worker.dropPercent}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}

      {!loading && activeSection === "moderation" ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Top Complaint Category"
              value={topCategories[0] ? `${topCategories[0][0]} (${topCategories[0][1]})` : "N/A"}
              icon={BadgeAlert}
            />
            <StatCard
              title="Second Most Common"
              value={topCategories[1] ? `${topCategories[1][0]} (${topCategories[1][1]})` : "N/A"}
              icon={Layers3}
            />
            <StatCard title="Open Complaints" value={complaints.filter((x) => x.status === "Open").length} icon={Clock3} />
            <StatCard title="Deactivation Complaints" value={deactivationComplaints} icon={AlertTriangle} intent="alert" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <Card className="relative">
              <CardHeader>
                <CardTitle className="text-lg">Moderation Feed</CardTitle>
                <CardDescription>Anonymous worker complaints with category and platform context</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[520px] pr-4">
                  <div className="space-y-3">
                    {complaints.map((complaint) => (
                      <div key={complaint.id} className="rounded-lg border bg-muted/30 p-4">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{complaint.platform}</Badge>
                              <Badge>{complaint.category}</Badge>
                              <span className="text-xs text-muted-foreground">{complaint.workerId}</span>
                            </div>
                            <p className="text-sm text-foreground">{complaint.description}</p>
                          </div>
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 accent-primary"
                            checked={selectedComplaintIds.includes(complaint.id)}
                            onChange={() => selectComplaint(complaint.id)}
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <TagPicker
                            selectedTags={complaint.tags}
                            onToggleTag={(tag) => toggleTag(complaint.id, tag)}
                          />
                          <div className="flex flex-wrap gap-1">
                            {complaint.tags.map((tag) => (
                              <Badge key={`${complaint.id}-${tag}`} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {selectedComplaintIds.length > 1 ? (
                  <div className="sticky bottom-0 mt-4 flex items-center justify-between rounded-lg border bg-background/95 p-3 backdrop-blur">
                    <p className="text-sm text-muted-foreground">{selectedComplaintIds.length} complaints selected</p>
                    <Button onClick={clusterSelected}>
                      <Layers3 className="h-4 w-4" />
                      Cluster Issues Together
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status Workflow Board</CardTitle>
                <CardDescription>Transition complaints across open, escalated, and resolved states</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3">
                  {statusFlow.map((status) => (
                    <div key={status} className="rounded-lg border bg-muted/20 p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold">{status}</h3>
                        <Badge variant="outline">{complaints.filter((item) => item.status === status).length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {complaints
                          .filter((item) => item.status === status)
                          .map((item) => (
                            <div key={item.id} className="rounded-md border bg-card p-2">
                              <p className="text-xs font-medium">{item.category}</p>
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                              <div className="mt-2 flex items-center justify-between gap-1">
                                {status !== "Open" ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() =>
                                      moveComplaintStatus(item.id, statusFlow[statusFlow.indexOf(status) - 1])
                                    }
                                  >
                                    Back
                                  </Button>
                                ) : (
                                  <span />
                                )}
                                {status !== "Resolved" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() =>
                                      moveComplaintStatus(item.id, statusFlow[statusFlow.indexOf(status) + 1])
                                    }
                                  >
                                    Move
                                  </Button>
                                ) : (
                                  <CircleCheckBig className="h-4 w-4 text-emerald-500" />
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdvocateDashboard;
