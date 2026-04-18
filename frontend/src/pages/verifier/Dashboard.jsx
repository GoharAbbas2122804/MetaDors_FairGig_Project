import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Expand,
  Loader2,
  SearchX,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MOCK_QUEUE = [
  {
    id: "v-001",
    workerId: "FG-WRK-43A2",
    platform: "Uber",
    claimedDate: "2026-04-10",
    claimedGrossIncome: 152.25,
    platformDeductions: 24.12,
    claimedNetIncome: 128.13,
    claimedHours: 8.5,
    status: "Pending",
    evidenceImage:
      "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "v-002",
    workerId: "FG-WRK-8FD1",
    platform: "Foodpanda",
    claimedDate: "2026-04-11",
    claimedGrossIncome: 96.7,
    platformDeductions: 10.2,
    claimedNetIncome: 86.5,
    claimedHours: 6.25,
    status: "Flagged",
    evidenceImage:
      "https://images.unsplash.com/photo-1556740768-90de374c12ad?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "v-003",
    workerId: "FG-WRK-2CZ9",
    platform: "Grab",
    claimedDate: "2026-04-12",
    claimedGrossIncome: 132.4,
    platformDeductions: 18.9,
    claimedNetIncome: 113.5,
    claimedHours: 7.75,
    status: "Pending",
    evidenceImage:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "v-004",
    workerId: "FG-WRK-11BT",
    platform: "Pathao",
    claimedDate: "2026-04-12",
    claimedGrossIncome: 78.0,
    platformDeductions: 12.0,
    claimedNetIncome: 66.0,
    claimedHours: 5.0,
    status: "Reviewed",
    evidenceImage:
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "v-005",
    workerId: "FG-WRK-9QA7",
    platform: "ShopeeFood",
    claimedDate: "2026-04-13",
    claimedGrossIncome: 141.4,
    platformDeductions: 17.15,
    claimedNetIncome: 124.25,
    claimedHours: 8.0,
    status: "Pending",
    evidenceImage:
      "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1400&q=80",
  },
];

const SORTABLE_COLUMNS = {
  workerId: (record) => record.workerId,
  platform: (record) => record.platform,
  claimedDate: (record) => record.claimedDate,
  claimedNetIncome: (record) => record.claimedNetIncome,
  status: (record) => record.status,
};

const statusBadgeClassname = {
  Pending: "bg-amber-100 text-amber-800 border-amber-300",
  Flagged: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Reviewed: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

function SortHeader({ label, sortKey, sortConfig, onSort }) {
  const active = sortConfig.key === sortKey;
  const direction = active ? sortConfig.direction : null;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="inline-flex items-center gap-1.5 text-left font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      aria-label={`Sort by ${label}`}
    >
      <span>{label}</span>
      {direction === "asc" ? <ChevronUp className="h-4 w-4" /> : null}
      {direction === "desc" ? <ChevronDown className="h-4 w-4" /> : null}
    </button>
  );
}

const readonlyFieldClassName = "mt-1 bg-muted/50 border-muted-foreground/20 text-foreground font-medium";

const VerifierDashboard = () => {
  const [queue, setQueue] = useState(MOCK_QUEUE);
  const [sortConfig, setSortConfig] = useState({ key: "claimedDate", direction: "asc" });
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(MOCK_QUEUE[0]?.id ?? null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState("");

  const sortedQueue = useMemo(() => {
    const keyFn = SORTABLE_COLUMNS[sortConfig.key];
    const cloned = [...queue];
    return cloned.sort((a, b) => {
      const first = keyFn(a);
      const second = keyFn(b);
      if (first < second) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (first > second) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [queue, sortConfig]);

  const selectedSubmission = useMemo(
    () => queue.find((record) => record.id === selectedSubmissionId) ?? sortedQueue[0] ?? null,
    [queue, selectedSubmissionId, sortedQueue]
  );

  const handleSort = (key) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const selectSubmission = (record) => {
    setSelectedSubmissionId(record.id);
    setZoomLevel(1);
  };

  const moveToNextSubmission = (removedId) => {
    const remainingItems = sortedQueue.filter((record) => record.id !== removedId);
    setSelectedSubmissionId(remainingItems[0]?.id ?? null);
    setZoomLevel(1);
  };

  const simulateAction = async (actionType) => {
    if (!selectedSubmission) {
      return;
    }
    setActionLoading(true);
    setActiveAction(actionType);

    await new Promise((resolve) => setTimeout(resolve, 1200));

    const removedId = selectedSubmission.id;
    setQueue((current) => current.filter((record) => record.id !== removedId));
    moveToNextSubmission(removedId);
    setActionLoading(false);
    setActiveAction("");
  };

  const handleFlagDiscrepancy = async () => {
    const cleanedReason = flagReason.trim();
    if (!cleanedReason) {
      return;
    }
    setShowFlagModal(false);
    setFlagReason("");
    await simulateAction("Flag Discrepancy");
  };

  const handleConfirm = async () => simulateAction("Confirm Match");
  const handleUnverifiable = async () => simulateAction("Mark Unverifiable");

  const queueCount = queue.length;
  const pendingCount = queue.filter((record) => record.status === "Pending").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verifier Portal</h1>
          <p className="text-sm text-muted-foreground">
            Review each submission against screenshot evidence and process it in one pass.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="font-semibold">
            Queue: {queueCount}
          </Badge>
          <Badge className={statusBadgeClassname.Pending}>Pending: {pendingCount}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Verification Queue</CardTitle>
          <CardDescription>Sortable table of incoming and in-progress worker claims.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortHeader label="Worker ID" sortKey="workerId" sortConfig={sortConfig} onSort={handleSort} />
                </TableHead>
                <TableHead>
                  <SortHeader label="Platform" sortKey="platform" sortConfig={sortConfig} onSort={handleSort} />
                </TableHead>
                <TableHead>
                  <SortHeader label="Claimed Date" sortKey="claimedDate" sortConfig={sortConfig} onSort={handleSort} />
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader
                    label="Claimed Net Income"
                    sortKey="claimedNetIncome"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
                </TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedQueue.map((record) => (
                <TableRow
                  key={record.id}
                  data-state={selectedSubmission?.id === record.id ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => selectSubmission(record)}
                >
                  <TableCell className="font-medium">{record.workerId}</TableCell>
                  <TableCell>{record.platform}</TableCell>
                  <TableCell>{dateFormatter.format(new Date(record.claimedDate))}</TableCell>
                  <TableCell className="text-right">{currencyFormatter.format(record.claimedNetIncome)}</TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClassname[record.status]}>{record.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        selectSubmission(record);
                      }}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sortedQueue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span>Queue cleared. No pending submissions to review.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Split-Pane Review Workspace</CardTitle>
          <CardDescription>
            Compare self-reported values with platform screenshot evidence for the selected worker.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-4 flex flex-col min-h-[420px]">
            {!selectedSubmission ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <SearchX className="h-6 w-6" />
                <p className="text-sm">Select a row from the queue to load submitted data.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Gross Income
                    <Input readOnly value={currencyFormatter.format(selectedSubmission.claimedGrossIncome)} className={readonlyFieldClassName} />
                  </label>
                  <label className="text-sm font-medium">
                    Platform Deductions
                    <Input readOnly value={currencyFormatter.format(selectedSubmission.platformDeductions)} className={readonlyFieldClassName} />
                  </label>
                  <label className="text-sm font-medium">
                    Net Income
                    <Input readOnly value={currencyFormatter.format(selectedSubmission.claimedNetIncome)} className={readonlyFieldClassName} />
                  </label>
                  <label className="text-sm font-medium">
                    Hours Worked
                    <Input readOnly value={`${selectedSubmission.claimedHours} hrs`} className={readonlyFieldClassName} />
                  </label>
                </div>

                <div className="mt-auto sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pt-4">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Button
                      type="button"
                      onClick={handleConfirm}
                      disabled={actionLoading}
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      {actionLoading && activeAction === "Confirm Match" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Confirm Match
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowFlagModal(true)}
                      disabled={actionLoading}
                      className="bg-yellow-500 text-black hover:bg-yellow-600"
                    >
                      {actionLoading && activeAction === "Flag Discrepancy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
                      Flag Discrepancy
                    </Button>
                    <Button type="button" variant="destructive" onClick={handleUnverifiable} disabled={actionLoading}>
                      {actionLoading && activeAction === "Mark Unverifiable" ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
                      Mark Unverifiable
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-3 min-h-[420px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Evidence Screenshot</h3>
              <div className="flex items-center gap-2">
                <Button type="button" size="icon" variant="outline" onClick={() => setZoomLevel((value) => Math.max(1, value - 0.2))} disabled={!selectedSubmission}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="outline" onClick={() => setZoomLevel((value) => Math.min(3, value + 0.2))} disabled={!selectedSubmission}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsFullscreen(true)} disabled={!selectedSubmission}>
                  <Expand className="h-4 w-4" />
                  Full Screen
                </Button>
              </div>
            </div>
            <div className="flex h-[340px] items-center justify-center overflow-auto rounded-md border bg-muted/30 p-2">
              {selectedSubmission ? (
                <img
                  src={selectedSubmission.evidenceImage}
                  alt={`Evidence submitted by ${selectedSubmission.workerId}`}
                  className="max-w-full rounded-md transition-transform duration-200 ease-out"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No screenshot selected</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {showFlagModal ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg">
            <h2 className="text-base font-semibold">Flag Discrepancy</h2>
            <p className="mt-1 text-sm text-muted-foreground">Add a short reason for dispute to help audit review decisions.</p>
            <label className="mt-3 block text-sm font-medium">
              Reason
              <textarea
                value={flagReason}
                onChange={(event) => setFlagReason(event.target.value)}
                placeholder="Net income does not match screenshot"
                rows={4}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowFlagModal(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button type="button" onClick={handleFlagDiscrepancy} disabled={actionLoading || !flagReason.trim()}>
                {actionLoading && activeAction === "Flag Discrepancy" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Submit Flag
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isFullscreen && selectedSubmission ? (
        <div className="fixed inset-0 z-50 bg-black/80 p-4">
          <div className="flex h-full w-full flex-col gap-3">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsFullscreen(false)}>
                Close
              </Button>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-auto rounded-md border border-white/20 bg-black/40 p-3">
              <img
                src={selectedSubmission.evidenceImage}
                alt={`Fullscreen evidence for ${selectedSubmission.workerId}`}
                className="max-h-full max-w-full rounded-md"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default VerifierDashboard;
