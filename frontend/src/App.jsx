import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Public Pages
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';

// Worker Pages
import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkerLogs from './pages/worker/Logs';
import WorkerCertificate from './pages/worker/IncomeCertificate';
import WorkerCommunity from './pages/worker/Community';

// Verifier Pages
import VerifierDashboard from './pages/verifier/Dashboard';
import VerifierQueue from './pages/verifier/Queue';

// Advocate Pages
import AdvocateDashboard from './pages/advocate/Dashboard';
import AdvocateGrievances from './pages/advocate/Grievances';
import AdvocateAnomalies from './pages/advocate/Anomalies';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected Routes inside Layout */}
      <Route element={<DashboardLayout />}>
        
        {/* Worker Routes */}
        <Route element={<ProtectedRoute allowedRoles={['worker']} />}>
          <Route path="/worker/dashboard" element={<WorkerDashboard />} />
          <Route path="/worker/logs" element={<WorkerLogs />} />
          <Route path="/worker/certificate" element={<WorkerCertificate />} />
          <Route path="/worker/community" element={<WorkerCommunity />} />
        </Route>

        {/* Verifier Routes */}
        <Route element={<ProtectedRoute allowedRoles={['verifier']} />}>
          <Route path="/verifier/dashboard" element={<VerifierDashboard />} />
          <Route path="/verifier/queue" element={<VerifierQueue />} />
        </Route>

        {/* Advocate Routes */}
        <Route element={<ProtectedRoute allowedRoles={['advocate']} />}>
          <Route path="/advocate/dashboard" element={<AdvocateDashboard />} />
          <Route path="/advocate/grievances" element={<AdvocateGrievances />} />
          <Route path="/advocate/anomalies" element={<AdvocateAnomalies />} />
        </Route>

      </Route>

      {/* Default Fallback */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
