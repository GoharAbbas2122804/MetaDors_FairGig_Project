import React from 'react';

import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, 
  User, 
  LayoutDashboard, 
  ClipboardList, 
  Award, 
  Users, 
  ListChecks, 
  AlertTriangle,
  Lightbulb
} from 'lucide-react';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleLinks = {
    worker: [
      { name: 'Dashboard', path: '/worker/dashboard', icon: LayoutDashboard },
      { name: 'My Logs', path: '/worker/logs', icon: ClipboardList },
      { name: 'Certificates', path: '/worker/certificate', icon: Award },
      { name: 'Community', path: '/worker/community', icon: Users },
    ],
    verifier: [
      { name: 'Dashboard', path: '/verifier/dashboard', icon: LayoutDashboard },
      { name: 'Queue', path: '/verifier/queue', icon: ListChecks },
    ],
    advocate: [
      { name: 'Dashboard', path: '/advocate/dashboard', icon: LayoutDashboard },
      { name: 'Grievances', path: '/advocate/grievances', icon: ClipboardList },
      { name: 'Anomalies', path: '/advocate/anomalies', icon: AlertTriangle },
    ]
  };

  const links = roleLinks[user?.role] || [];

  return (
    <div className="flex h-[100dvh] w-full bg-muted/40 print:bg-white">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r bg-background flex flex-col items-stretch print:hidden">
        <div className="h-16 flex items-center px-6 border-b font-bold text-xl text-primary gap-2">
          <Lightbulb className="h-6 w-6" />
          <span>FairGig</span>
        </div>
        <div className="p-4 flex-1">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-4 px-2">
            {user.role} Portal
          </div>
          <nav className="flex flex-col gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-6 border-b bg-background flex-shrink-0 print:hidden">
          <h2 className="text-sm font-medium text-muted-foreground hidden sm:block">
            {location.pathname}
          </h2>
          <div className="flex-1"></div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 bg-muted rounded-full">
              <User className="h-4 w-4" />
              <span className="capitalize">{user.name}</span>
            </div>
            <button
              onClick={logout}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors shrink-0 tooltip"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 print:overflow-visible print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
