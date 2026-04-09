"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

interface SupervisorOverview {
  teamSize: number;
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
  activeTasks: number;
  overdueCount: number;
}

interface AttendanceEntry {
  uid: string;
  name: string;
  checkinTime: string | null;
  checkoutTime: string | null;
  status: "present" | "absent" | "leave";
  monthlyDays: number;
}

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<SupervisorOverview>({ teamSize: 0, presentToday: 0, absentToday: 0, onLeaveToday: 0, activeTasks: 0, overdueCount: 0 });
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [timezone, setTimezone] = useState("Asia/Kuala_Lumpur");
  const [monthLabel, setMonthLabel] = useState("");
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
      const res = await fetch(`/api/dashboard/supervisor?uid=${encodeURIComponent(uid)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.overview) setOverview(data.overview);
        if (data.attendance) setAttendance(data.attendance);
        if (data.timezone) setTimezone(data.timezone);
        if (data.month) setMonthLabel(data.month);
      }
    } catch (err) {
      console.error("Failed to fetch supervisor dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><div className="border-primary h-7 w-7 animate-spin rounded-full border-b-2"></div></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-black dark:text-white">Supervisor Dashboard</h2>
          <p className="text-xs text-gray-500">Welcome back, {user?.name}</p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <div className="font-mono text-sm">{clock}</div>
          <div>{timezone}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Present", value: overview.presentToday, sub: `of ${overview.teamSize}`, color: "text-green-600" },
          { label: "Absent", value: overview.absentToday, color: "text-red-600" },
          { label: "Active Tasks", value: overview.activeTasks, color: "text-blue-600" },
          { label: "Overdue", value: overview.overdueCount, color: "text-orange-600" },
        ].map((c) => (
          <div key={c.label} className="rounded border border-stroke bg-white px-3 py-2 dark:border-strokedark dark:bg-boxdark">
            <p className="text-[11px] text-gray-500">{c.label}</p>
            <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
            {c.sub && <p className="text-[10px] text-gray-400">{c.sub}</p>}
          </div>
        ))}
      </div>

      <div className="rounded border border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
        <div className="px-3 py-2 border-b border-stroke dark:border-strokedark">
          <h4 className="text-sm font-semibold text-black dark:text-white">Team Attendance {monthLabel && <span className="text-[10px] font-normal text-gray-400">({monthLabel})</span>}</h4>
        </div>
        {attendance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-2 dark:bg-meta-4">
                  <th className="px-2 py-1.5 text-left font-medium">Name</th>
                  <th className="px-2 py-1.5 text-left font-medium">Today</th>
                  <th className="px-2 py-1.5 text-left font-medium">Check In</th>
                  <th className="px-2 py-1.5 text-left font-medium">Check Out</th>
                  <th className="px-2 py-1.5 text-left font-medium">Monthly</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((e) => (
                  <tr key={e.uid} className="border-b border-stroke dark:border-strokedark">
                    <td className="px-2 py-1.5 font-medium text-black dark:text-white">{e.name}</td>
                    <td className="px-2 py-1.5">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        e.status === "present" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}>{e.status}</span>
                    </td>
                    <td className="px-2 py-1.5 text-gray-500">{e.checkinTime || "—"}</td>
                    <td className="px-2 py-1.5 text-gray-500">{e.checkoutTime || "—"}</td>
                    <td className="px-2 py-1.5 text-gray-500">{e.monthlyDays}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-xs text-gray-400">No attendance data available</p>
        )}
      </div>
    </div>
  );
}
