import React from 'react';

const WorkerLogs = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
      </div>
      <div className="min-h-[500px] rounded-xl border border-dashed border-border bg-card p-6 flex flex-col items-center justify-center text-muted-foreground text-center space-y-2">
        <h3 className="font-semibold text-foreground">Logs Table</h3>
        <p className="text-sm">A data table displaying recent working hours, trips, and earnings uploaded.</p>
      </div>
    </div>
  );
};

export default WorkerLogs;
