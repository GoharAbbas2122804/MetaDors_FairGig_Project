import React from 'react';
import { motion } from 'framer-motion';
import { IncomeAnalytics } from '../../components/worker/IncomeAnalytics';
import { ShiftLogger } from '../../components/worker/ShiftLogger';
import { WorkerProfileWidget } from '../../components/worker/WorkerProfileWidget';

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

export default function WorkerDashboard() {
  return (
    <motion.div 
      className="space-y-6 max-w-7xl mx-auto pb-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="flex flex-col gap-2" variants={itemVariants}>
        <h1 className="text-3xl font-bold tracking-tight">Worker Dashboard</h1>
        <p className="text-muted-foreground">Monitor your earnings and log your shifts to verify fair compensation.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div className="lg:col-span-2 space-y-6" variants={itemVariants}>
          <IncomeAnalytics />
        </motion.div>
        
        <div className="space-y-6 flex flex-col">
          <motion.div variants={itemVariants}>
            <WorkerProfileWidget status="Verified" />
          </motion.div>
          <motion.div variants={itemVariants} className="flex-1">
            <ShiftLogger />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
