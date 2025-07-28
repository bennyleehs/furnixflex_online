"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
// import AttendanceTracker from "@/components/Attendance/AttendanceTracker";

interface DashboardStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    newThisMonth: number;
  };
  departments: {
    total: number;
    active: number;
  };
  roles: {
    total: number;
    admin: number;
    user: number;
    manager: number;
  };
  system: {
    totalLogins: number;
    todayLogins: number;
    storage: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  activities: {
    id: number;
    user: string;
    action: string;
    timestamp: string;
    type: "login" | "create" | "update" | "delete";
  }[];
}

export default function Administration() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/dashboard");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="border-primary h-12 w-12 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Administration Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Overview of system administration and user management
          </p>
        </div>
        <div className="mt-4 flex space-x-3 sm:mt-0">
          <Link
            href="/admin/users"
            className="bg-primary hover:bg-primary/90 inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm"
          >
            Manage Users
          </Link>
          <Link
            href="/admin/settings"
            className="dark:bg-boxdark dark:border-strokedark inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:text-gray-300"
          >
            System Settings
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <div className="dark:bg-boxdark border-stroke dark:border-strokedark shadow-default rounded-sm border bg-white">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <svg
                    className="h-6 w-6 text-blue-600 dark:text-blue-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Total Users
                </h3>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {stats?.users.total || 0}
                  </p>
                  <p className="ml-2 text-sm text-green-600 dark:text-green-400">
                    +{stats?.users.newThisMonth || 0} this month
                  </p>
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {stats?.users.active || 0} active,{" "}
                  {stats?.users.inactive || 0} inactive
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Departments */}
        <div className="dark:bg-boxdark border-stroke dark:border-strokedark shadow-default rounded-sm border bg-white">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <svg
                    className="h-6 w-6 text-green-600 dark:text-green-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Departments
                </h3>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {stats?.departments.total || 0}
                  </p>
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {stats?.departments.active || 0} active departments
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Logins */}
        <div className="dark:bg-boxdark border-stroke dark:border-strokedark shadow-default rounded-sm border bg-white">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900">
                  <svg
                    className="h-6 w-6 text-yellow-600 dark:text-yellow-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Today&apos;s Logins
                </h3>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {stats?.system.todayLogins || 0}
                  </p>
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {stats?.system.totalLogins || 0} total logins
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="dark:bg-boxdark border-stroke dark:border-strokedark shadow-default rounded-sm border bg-white">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                  <svg
                    className="h-6 w-6 text-purple-600 dark:text-purple-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-9 0v16a2 2 0 002 2h6a2 2 0 002-2V4"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Storage Usage
                </h3>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {stats?.system.storage.percentage || 0}%
                  </p>
                </div>
                <div className="mt-2">
                  <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-2 rounded-full bg-purple-600 transition-all duration-300"
                      style={{
                        width: `${stats?.system.storage.percentage || 0}%`,
                      }}
                    ></div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {(
                      (stats?.system.storage.used || 0) /
                      1024 /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    GB of{" "}
                    {(
                      (stats?.system.storage.total || 0) /
                      1024 /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    GB
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Tracker - for current user */}
      {/* <AttendanceTracker
        employeeId="current_user_id" // Replace with actual user ID from session
        employeeName="Current User Name" // Replace with actual user name from session
      /> */}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activities */}
        <div className="lg:col-span-2">
          <div className="dark:bg-boxdark border-stroke dark:border-strokedark shadow-default rounded-sm border bg-white">
            <div className="border-stroke dark:border-strokedark border-b px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Recent Activities
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {stats?.activities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                        activity.type === "login"
                          ? "bg-blue-100 dark:bg-blue-900"
                          : activity.type === "create"
                            ? "bg-green-100 dark:bg-green-900"
                            : activity.type === "update"
                              ? "bg-yellow-100 dark:bg-yellow-900"
                              : "bg-red-100 dark:bg-red-900"
                      }`}
                    >
                      {activity.type === "login" && (
                        <svg
                          className="h-4 w-4 text-blue-600 dark:text-blue-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                          />
                        </svg>
                      )}
                      {activity.type === "create" && (
                        <svg
                          className="h-4 w-4 text-green-600 dark:text-green-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                      )}
                      {activity.type === "update" && (
                        <svg
                          className="h-4 w-4 text-yellow-600 dark:text-yellow-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      )}
                      {activity.type === "delete" && (
                        <svg
                          className="h-4 w-4 text-red-600 dark:text-red-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-medium">{activity.user}</span>{" "}
                        {activity.action}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )) || (
                  <div className="py-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      No recent activities
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="dark:bg-boxdark border-stroke dark:border-strokedark shadow-default rounded-sm border bg-white">
            <div className="border-stroke dark:border-strokedark border-b px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Quick Actions
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <Link
                  href="/admin/users/new"
                  className="block w-full rounded-lg bg-blue-50 px-4 py-3 text-left transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40"
                >
                  <div className="flex items-center">
                    <svg
                      className="mr-3 h-5 w-5 text-blue-600 dark:text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Add New User
                    </span>
                  </div>
                </Link>

                <Link
                  href="/admin/departments"
                  className="block w-full rounded-lg bg-green-50 px-4 py-3 text-left transition-colors hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40"
                >
                  <div className="flex items-center">
                    <svg
                      className="mr-3 h-5 w-5 text-green-600 dark:text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Manage Departments
                    </span>
                  </div>
                </Link>

                <Link
                  href="/admin/roles"
                  className="block w-full rounded-lg bg-yellow-50 px-4 py-3 text-left transition-colors hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/40"
                >
                  <div className="flex items-center">
                    <svg
                      className="mr-3 h-5 w-5 text-yellow-600 dark:text-yellow-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Role Management
                    </span>
                  </div>
                </Link>

                <Link
                  href="/admin/logs"
                  className="block w-full rounded-lg bg-purple-50 px-4 py-3 text-left transition-colors hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40"
                >
                  <div className="flex items-center">
                    <svg
                      className="mr-3 h-5 w-5 text-purple-600 dark:text-purple-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      System Logs
                    </span>
                  </div>
                </Link>

                <Link
                  href="/admin/backup"
                  className="block w-full rounded-lg bg-red-50 px-4 py-3 text-left transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40"
                >
                  <div className="flex items-center">
                    <svg
                      className="mr-3 h-5 w-5 text-red-600 dark:text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Backup & Restore
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="dark:bg-boxdark border-stroke dark:border-strokedark shadow-default mt-6 rounded-sm border bg-white">
            <div className="border-stroke dark:border-strokedark border-b px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                System Status
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Database
                  </span>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Server Status
                  </span>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                    Healthy
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Backup Status
                  </span>
                  <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    Scheduled
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Last Backup
                  </span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    2 hours ago
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
