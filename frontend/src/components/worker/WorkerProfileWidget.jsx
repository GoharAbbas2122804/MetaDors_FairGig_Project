import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, ShieldCheck, AlertCircle, Clock, ShieldX } from "lucide-react";

function formatJoinedDate(value) {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function WorkerProfileWidget({
  user,
  status = "Pending",
  totalLogs = 0,
  verificationSummary,
}) {
  let statusVariant = "default";
  let StatusIcon = ShieldCheck;

  if (status === "Pending") {
    statusVariant = "secondary";
    StatusIcon = Clock;
  } else if (status === "Flagged") {
    statusVariant = "destructive";
    StatusIcon = AlertCircle;
  } else if (status === "Unverifiable") {
    statusVariant = "outline";
    StatusIcon = ShieldX;
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center gap-4 pb-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-6 w-6" />
        </div>
        <div className="flex flex-col">
          <CardTitle className="text-lg">{user?.fullName || "Worker"}</CardTitle>
          <span className="text-sm text-muted-foreground">ID: {user?._id || "N/A"}</span>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Verification Status</span>
          <Badge variant={statusVariant} className="flex items-center gap-1 px-2.5 py-0.5">
            <StatusIcon className="h-3.5 w-3.5" />
            {status}
          </Badge>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Joined</span>
          <span className="font-medium">{formatJoinedDate(user?.createdAt)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">City Zone</span>
          <span className="font-medium">{user?.demographics?.cityZone || "Not set"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Logs</span>
          <span className="font-medium">{totalLogs} Shifts</span>
        </div>
        <div className="grid gap-2 rounded-lg bg-muted/40 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Confirmed</span>
            <span className="font-medium">{verificationSummary?.confirmed || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Pending</span>
            <span className="font-medium">{verificationSummary?.pending || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Flagged</span>
            <span className="font-medium">{verificationSummary?.flagged || 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
