import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, ShieldCheck, AlertCircle, Clock } from "lucide-react";

export function WorkerProfileWidget({ status = "Verified" }) {
  // Determine variant and icon based on status
  let statusVariant = "default";
  let StatusIcon = ShieldCheck;
  
  if (status === "Pending") {
    statusVariant = "secondary";
    StatusIcon = Clock;
  } else if (status === "Flagged") {
    statusVariant = "destructive";
    StatusIcon = AlertCircle;
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <User className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <CardTitle className="text-lg">Jane Doe</CardTitle>
          <span className="text-sm text-muted-foreground">ID: FG-X492A</span>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Verification Status</span>
          <Badge variant={statusVariant} className="flex gap-1 items-center px-2.5 py-0.5">
            <StatusIcon className="w-3.5 h-3.5" />
            {status}
          </Badge>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Joined</span>
          <span className="font-medium">March 2024</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Logs</span>
          <span className="font-medium">124 Shifts</span>
        </div>
      </CardContent>
    </Card>
  );
}
