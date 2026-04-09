"use client";

import DefaultLayout from "@/components/Layouts/DefaultLayout";
import { useAuth } from "@/context/AuthContext";
import ManagingDirectorDashboard from "@/components/Dashboard/ManagingDirectorDashboard";
import DirectorDashboard from "@/components/Dashboard/DirectorDashboard";
import ManagerDashboard from "@/components/Dashboard/ManagerDashboard";
import AssistantManagerDashboard from "@/components/Dashboard/AssistantManagerDashboard";
import SupervisorDashboard from "@/components/Dashboard/SupervisorDashboard";
import StaffDashboard from "@/components/Dashboard/StaffDashboard";

// Main dashboard = role-based summary dashboard
function getMainDashboardByRole(role: string) {

  switch (role) {
    case "Managing Director":
      return <ManagingDirectorDashboard />;
    case "Director":
      return <DirectorDashboard />;
    case "Non-Executive Director":
      return <DirectorDashboard />;
    case "Manager":
      return <ManagerDashboard />;
    case "Chief Officer":
      return <ManagerDashboard />;
    case "Assistant Manager":
      return <AssistantManagerDashboard />;
    case "Supervisor":
      return <SupervisorDashboard />;
    case "Staff":
      return <StaffDashboard />;
    // case "Partner":
    // default:
      // return <StaffDashboard />;
  }
}

export default function Home() {
  const { user, isLoading } = useAuth();

  return (
    <DefaultLayout>
      {isLoading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
        </div>
      ) : (
        getMainDashboardByRole(user?.role || "")
      )}
    </DefaultLayout>
  );
}
