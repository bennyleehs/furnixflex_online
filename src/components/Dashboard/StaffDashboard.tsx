"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

interface StaffOverview {
  myTasks: number;
  completedTasks: number;
  myQuotations: number;
  myDeals: number;
}

interface MyTask {
  id: number;
  title: string;
  status: "pending" | "in-progress" | "completed";
  dueDate: string;
}

interface AttendanceRecord {
  checkin_time: string | null;
  checkout_time: string | null;
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<StaffOverview>({ myTasks: 0, completedTasks: 0, myQuotations: 0, myDeals: 0 });
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [monthlyDays, setMonthlyDays] = useState(0);
  const [monthLabel, setMonthLabel] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kuala_Lumpur");
  const [clock, setClock] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) fetchOverview(user.uid);
  }, [user?.uid]);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timezone]);

  const fetchOverview = async (uid: string) => {
    try {
      const res = await fetch(`/api/dashboard/staff?uid=${encodeURIComponent(uid)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.overview) setOverview(data.overview);
        if (data.tasks) setTasks(data.tasks);
        if (data.attendance) setAttendance(data.attendance);
        if (data.timezone) setTimezone(data.timezone);
        if (data.monthlyAttendance) {
          setMonthlyDays(data.monthlyAttendance.daysPresent);
          setMonthLabel(data.monthlyAttendance.month);
        }
      }
    } catch (err) {
      console.error("Failed to fetch staff dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><div className="border-primary h-7 w-7 animate-spin rounded-full border-b-2"></div></div>;
  }

  const pct = overview.myTasks + overview.completedTasks > 0
    ? Math.round((overview.completedTasks / (overview.myTasks + overview.completedTasks)) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-black dark:text-white">My Dashboard</h2>
          <p className="text-xs text-gray-500">Welcome back, {user?.name}</p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <div className="font-mono text-sm">{clock}</div>
          <div>{timezone}</div>
        </div>
      </div>

      {/* KPI row - compact */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Active Tasks", value: overview.myTasks, sub: `${pct}% done`, color: "text-blue-600" },
          { label: "Completed", value: overview.completedTasks, color: "text-green-600" },
          { label: "Total Leads", value: overview.myQuotations, color: "text-purple-600" },
          { label: "Deals", value: overview.myDeals, color: "text-emerald-600" },
        ].map((c) => (
          <div key={c.label} className="rounded border border-stroke bg-white px-3 py-2 dark:border-strokedark dark:bg-boxdark">
            <p className="text-[11px] text-gray-500">{c.label}</p>
            <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
            {c.sub && <p className="text-[10px] text-gray-400">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Attendance row */}
      <div className="flex flex-wrap items-center gap-3 rounded border border-stroke bg-white px-3 py-2 dark:border-strokedark dark:bg-boxdark">
        <div className="flex-1">
          <p className="text-[11px] text-gray-500">Today</p>
          <p className="text-xs text-black dark:text-white">{attendance?.checkin_time ? `In: ${attendance.checkin_time}` : "Not checked in"}{attendance?.checkout_time ? ` · Out: ${attendance.checkout_time}` : ""}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-500">Monthly ({monthLabel})</p>
          <p className="text-xs font-semibold text-black dark:text-white">{monthlyDays} days</p>
        </div>
      </div>

      {/* Tasks table */}
      <div className="rounded border border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
        <div className="px-3 py-2 border-b border-stroke dark:border-strokedark">
          <h4 className="text-sm font-semibold text-black dark:text-white">My Tasks</h4>
        </div>
        {tasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-2 dark:bg-meta-4">
                  <th className="px-2 py-1.5 text-left font-medium">ID</th>
                  <th className="px-2 py-1.5 text-left font-medium">Name</th>
                  <th className="px-2 py-1.5 text-left font-medium">Status</th>
                  <th className="px-2 py-1.5 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} className="border-b border-stroke dark:border-strokedark">
                    <td className="px-2 py-1.5 font-mono text-gray-500">{t.id}</td>
                    <td className="px-2 py-1.5 font-medium text-black dark:text-white">{t.title}</td>
                    <td className="px-2 py-1.5">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        t.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : t.status === "in-progress" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}>{t.status}</span>
                    </td>
                    <td className="px-2 py-1.5 text-gray-500">{t.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-xs text-gray-400">No tasks assigned</p>
        )}
      </div>
    </div>
  );
}
