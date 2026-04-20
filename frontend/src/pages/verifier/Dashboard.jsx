import React, { useEffect, useMemo, useState } from "react";
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
import {
  earningsAPI,
  resolveServiceAssetUrl,
  serviceBaseUrls,
} from "../../services/api";
import { getApiErrorMessage } from "../../lib/getApiErrorMessage";

const SORTABLE_COLUMNS = {
  workerName: (record) => record.worker?.fullName || "",
  workerId: (record) => record.worker?._id || "",
  platform: (record) => record.platform,
  claimedDate: (record) => record.date,
  monthlyNet: (record) => record.workerMonthly?.net || 0,
  commissionRate: (record) => record.workerMonthly?.averageCommissionRate || 0,
  status: (record) => record.verificationStatus,
};

const statusBadgeClassname = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  flagged: "bg-yellow-100 text-yellow-800 border-yellow-300",
  confirmed: "bg-emerald-100 text-emerald-800 border-emerald-300",
  unverifiable: "bg-slate-200 text-slate-700 border-slate-300",
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
      className="inline-flex items-center gap-1.5 rounded-sm text-left font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Sort by ${label}`}
    >
      <span>{label}</span>
      {direction === "asc" ? <ChevronUp className="h-4 w-4" /> : null}
      {direction === "desc" ? <ChevronDown className="h-4 w-4" /> : null}
    </button>
  );
}

const readonlyFieldClassName =
  "mt-1 bg-muted/50 border-muted-foreground/20 text-foreground font-medium";

const VerifierDashboard = () => {
  const [queue, setQueue] = useState([]);
  const [summary, setSummary] = useState({ pending: 0, flagged: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "claimedDate", direction: "asc" });
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState("");

  const loadQueue = async (preferredId) => {
    try {
      setError("");
      const response = await earningsAPI.get("/api/earnings/verifier/queue");
      const nextQueue = response.data.queue || [];
      setQueue(nextQueue);
      setSummary(response.data.summary || { pending: 0, flagged: 0 });
      setSelectedSubmissionId((current) => {
        const candidate = preferredId || current;
        if (candidate && nextQueue.some((record) => record._id === candidate)) {
          return candidate;
        }
        return nextQueue[0]?._id || null;
      });
    } catch (loadError) {
      setError(
        getApiErrorMessage(loadError, "Unable to load the verification queue right now.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadQueue();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

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
    () => queue.find((record) => record._id === selectedSubmissionId) ?? sortedQueue[0] ?? null,
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
    setSelectedSubmissionId(record._id);
    setZoomLevel(1);
  };

  const submitVerification = async (verificationStatus, reviewNote = "") => {
    if (!selectedSubmission) {
      return;
    }

    setActionLoading(true);
    setActiveAction(verificationStatus);

    try {
      await earningsAPI.patch(
        `/api/earnings/shift/${selectedSubmission._id}/verification-status`,
        {
          verificationStatus,
          reviewNote,
        }
      );

      await loadQueue(selectedSubmission._id);
      setShowFlagModal(false);
      setFlagReason("");
    } catch (submitError) {
      setError(
        getApiErrorMessage(submitError, "Unable to update the verification status.")
      );
    } finally {
      setActionLoading(false);
      setActiveAction("");
    }
  };

  const queueCount = queue.length;
  const evidenceUrl = resolveServiceAssetUrl(
    serviceBaseUrls.earnings,
    selectedSubmission?.screenshotUrl
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verifier Portal</h1>
          <p className="text-sm text-muted-foreground">
            Review exact worker ID, name, monthly earnings, commission, tracking, and screenshot evidence from the database before approving each submission.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="font-semibold">
            Queue: {queueCount}
          </Badge>
          <Badge className={statusBadgeClassname.pending}>Pending: {summary.pending || 0}</Badge>
          <Badge className={statusBadgeClassname.flagged}>Flagged: {summary.flagged || 0}</Badge>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Verification Queue</CardTitle>
          <CardDescription>
            Every row below is fetched from the live `shifts` and `users` collections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-[220px] items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading queue data...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortHeader
                      label="Worker Name"
                      sortKey="workerName"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortHeader
                      label="Worker ID"
                      sortKey="workerId"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortHeader
                      label="Platform"
                      sortKey="platform"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortHeader
                      label="Claimed Date"
                      sortKey="claimedDate"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortHeader
                      label="Monthly Earnings"
                      sortKey="monthlyNet"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortHeader
                      label="Commission"
                      sortKey="commissionRate"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortHeader
                      label="Status"
                      sortKey="status"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedQueue.map((record) => (
                  <TableRow
                    key={record._id}
                    data-state={selectedSubmission?._id === record._id ? "selected" : undefined}
                    className="cursor-pointer"
                    onClick={() => selectSubmission(record)}
                  >
                    <TableCell className="font-medium">
                      {record.worker?.fullName || "Unknown worker"}
                    </TableCell>
                    <TableCell>{record.worker?._id || "N/A"}</TableCell>
                    <TableCell>{record.platform}</TableCell>
                    <TableCell>{dateFormatter.format(new Date(record.date))}</TableCell>
                    <TableCell className="text-right">
                      {currencyFormatter.format(record.workerMonthly?.net || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(record.workerMonthly?.averageCommissionRate || 0).toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      <Badge className={statusBadgeClassname[record.verificationStatus]}>
                        {record.verificationStatus}
                      </Badge>
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
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <span>Queue cleared. No pending or flagged submissions right now.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Split-Pane Review Workspace</CardTitle>
          <CardDescription>
            Compare saved shift values with the uploaded proof for the selected worker.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="flex min-h-[420px] flex-col rounded-lg border bg-card p-4">
            {!selectedSubmission ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <SearchX className="h-6 w-6" />
                <p className="text-sm">Select a row from the queue to load submitted data.</p>
              </div>
            ) : (
              <>
                <div className="mb-4 rounded-lg bg-muted/30 p-3">
                  <h3 className="text-sm font-semibold">Worker Snapshot</h3>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">Name</span>
                      <p className="font-medium">{selectedSubmission.worker?.fullName || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Worker ID</span>
                      <p className="font-medium break-all">{selectedSubmission.worker?._id || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Monthly Net</span>
                      <p className="font-medium">
                        {currencyFormatter.format(selectedSubmission.workerMonthly?.net || 0)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg Commission</span>
                      <p className="font-medium">
                        {Number(
                          selectedSubmission.workerMonthly?.averageCommissionRate || 0
                        ).toFixed(2)}
                        %
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Gross Income
                    <Input
                      readOnly
                      value={currencyFormatter.format(selectedSubmission.gross)}
                      className={readonlyFieldClassName}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Platform Deductions
                    <Input
                      readOnly
                      value={currencyFormatter.format(selectedSubmission.deductions)}
                      className={readonlyFieldClassName}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Net Income
                    <Input
                      readOnly
                      value={currencyFormatter.format(selectedSubmission.net)}
                      className={readonlyFieldClassName}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Hours Worked
                    <Input
                      readOnly
                      value={`${selectedSubmission.hours} hrs`}
                      className={readonlyFieldClassName}
                    />
                  </label>
                  <label className="text-sm font-medium sm:col-span-2">
                    Existing Flags / Notes
                    <Input
                      readOnly
                      value={
                        selectedSubmission.anomalyFlags?.length
                          ? selectedSubmission.anomalyFlags.join(" | ")
                          : "No flags saved"
                      }
                      className={readonlyFieldClassName}
                    />
                  </label>
                </div>

                <div className="mt-auto border-t bg-background/95 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Button
                      type="button"
                      onClick={() => submitVerification("confirmed")}
                      disabled={actionLoading}
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      {actionLoading && activeAction === "confirmed" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Confirm Match
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowFlagModal(true)}
                      disabled={actionLoading}
                      className="bg-yellow-500 text-black hover:bg-yellow-600"
                    >
                      {actionLoading && activeAction === "flagged" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      Flag Discrepancy
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => submitVerification("unverifiable")}
                      disabled={actionLoading}
                    >
                      {actionLoading && activeAction === "unverifiable" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      Mark Unverifiable
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="min-h-[420px] space-y-3 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Evidence Screenshot
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => setZoomLevel((value) => Math.max(1, value - 0.2))}
                  disabled={!selectedSubmission || !evidenceUrl}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => setZoomLevel((value) => Math.min(3, value + 0.2))}
                  disabled={!selectedSubmission || !evidenceUrl}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFullscreen(true)}
                  disabled={!selectedSubmission || !evidenceUrl}
                >
                  <Expand className="h-4 w-4" />
                  Full Screen
                </Button>
              </div>
            </div>
            <div className="flex h-[340px] items-center justify-center overflow-auto rounded-md border bg-muted/30 p-2">
              {selectedSubmission && evidenceUrl ? (
                <img
                  src={evidenceUrl}
                  alt={`Evidence submitted by ${selectedSubmission.worker?._id}`}
                  className="max-w-full rounded-md transition-transform duration-200 ease-out"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {selectedSubmission ? "No screenshot uploaded for this shift." : "No screenshot selected"}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {showFlagModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg">
            <h2 className="text-base font-semibold">Flag Discrepancy</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Save a short review note so the flag is preserved on the shift record.
            </p>
            <label className="mt-3 block text-sm font-medium">
              Reason
              <textarea
                value={flagReason}
                onChange={(event) => setFlagReason(event.target.value)}
                placeholder="Net income does not match the screenshot"
                rows={4}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFlagModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => submitVerification("flagged", flagReason)}
                disabled={actionLoading || !flagReason.trim()}
              >
                {actionLoading && activeAction === "flagged" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Submit Flag
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isFullscreen && selectedSubmission && evidenceUrl ? (
        <div className="fixed inset-0 z-50 bg-black/80 p-4">
          <div className="flex h-full w-full flex-col gap-3">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsFullscreen(false)}>
                Close
              </Button>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-auto rounded-md border border-white/20 bg-black/40 p-3">
              <img
                src={evidenceUrl}
                alt={`Fullscreen evidence for ${selectedSubmission.worker?._id}`}
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
