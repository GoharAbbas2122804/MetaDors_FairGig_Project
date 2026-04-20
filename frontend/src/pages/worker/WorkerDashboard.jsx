import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { IncomeAnalytics } from "../../components/worker/IncomeAnalytics";
import { ShiftLogger } from "../../components/worker/ShiftLogger";
import { WorkerProfileWidget } from "../../components/worker/WorkerProfileWidget";
import { Card, CardContent } from "@/components/ui/card";
import { earningsAPI } from "../../services/api";
import { getApiErrorMessage } from "../../lib/getApiErrorMessage";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};
const MotionDiv = motion.div;

export default function WorkerDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setError("");
      const response = await earningsAPI.get("/api/earnings/dashboard/worker");
      setDashboard(response.data);
    } catch (loadError) {
      setError(
        getApiErrorMessage(loadError, "Unable to load your dashboard data right now.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex min-h-[320px] items-center justify-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading your earnings, commission tracking, and shift records...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              loadDashboard();
            }}
            className="text-sm font-medium text-primary"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <MotionDiv
      className="mx-auto max-w-7xl space-y-6 pb-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <MotionDiv className="flex flex-col gap-2" variants={itemVariants}>
        <h1 className="text-3xl font-bold tracking-tight">Worker Dashboard</h1>
        <p className="text-muted-foreground">
          Your ID, name, monthly earnings, commission tracking, and shift records are
          now loaded directly from the database.
        </p>
      </MotionDiv>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <MotionDiv className="space-y-6 lg:col-span-2" variants={itemVariants}>
          <IncomeAnalytics
            monthly={dashboard?.monthly}
            dailyTrend={dashboard?.dailyTrend}
            recentShifts={dashboard?.recentShifts}
            verificationSummary={dashboard?.verificationSummary}
          />
        </MotionDiv>

        <div className="flex flex-col space-y-6">
          <MotionDiv variants={itemVariants}>
            <WorkerProfileWidget
              user={dashboard?.user}
              status={dashboard?.profileStatus}
              totalLogs={dashboard?.totalShiftCount}
              verificationSummary={dashboard?.verificationSummary}
            />
          </MotionDiv>
          <MotionDiv variants={itemVariants} className="flex-1">
            <ShiftLogger onShiftLogged={loadDashboard} />
          </MotionDiv>
        </div>
      </div>
    </MotionDiv>
  );
}
