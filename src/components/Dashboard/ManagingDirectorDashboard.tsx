"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

interface CompanyOverview {
  totalBranches: number;
  totalEmployees: number;
  activeEmployees: number;
  totalDepartments: number;
  revenueYtd: number;
  revenueTarget: number;
  totalQuotations: number;
  dealsClosed: number;
  pendingApprovals: number;
}

interface DepartmentSummary {
  name: string;
  headcount: number;
  activeTasks: number;
  completionRate: number;
}

export default function ManagingDirectorDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<CompanyOverview>({ totalBranches: 0, totalEmployees: 0, activeEmployees: 0, totalDepartments: 0, revenueYtd: 0, revenueTarget: 0, totalQuotations: 0, dealsClosed: 0, pendingApprovals: 0 });
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
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
      const res = await fetch(`/api/dashboard/managing-director?uid=${encodeURIComponent(uid)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.overview) setOverview(data.overview);
        if (data.departments) setDepartments(data.departments);
        if (data.timezone) setTimezone(data.timezone);
      }
    } catch (err) {
      console.error("Failed to fetch MD dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><div className="border-primary h-7 w-7 animate-spin rounded-full border-b-2"></div></div>;
  }

  const revPct = overview.revenueTarget > 0 ? Math.round((overview.revenueYtd / overview.revenueTarget) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-black dark:text-white">Managing Director Dashboard</h2>
          <p className="text-xs text-gray-500">Welcome back, {user?.name}</p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <div className="font-mono text-sm">{clock}</div>
          <div>{timezone}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Revenue YTD", value: `$${overview.revenueYtd.toLocaleString()}`, sub: `${revPct}% of target`, color: "text-blue-600" },
          { label: "Employees", value: overview.totalEmployees, sub: `${overview.activeEmployees} active · ${overview.totalBranches} branches`, color: "text-green-600" },
          { label: "Deals Closed", value: overview.dealsClosed, sub: `${overview.totalQuotations} total leads`, color: "text-emerald-600" },
          { label: "Approvals", value: overview.pendingApprovals, color: "text-orange-600" },
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
          <h4 className="text-sm font-semibold text-black dark:text-white">Department Overview</h4>
        </div>
        {departments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-2 dark:bg-meta-4">
                  <th className="px-2 py-1.5 text-left font-medium">Department</th>
                  <th className="px-2 py-1.5 text-left font-medium">Staff</th>
                  <th className="px-2 py-1.5 text-left font-medium">Active</th>
                  <th className="px-2 py-1.5 text-left font-medium">Done %</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d, i) => (
                  <tr key={i} className="border-b border-stroke dark:border-strokedark">
                    <td className="px-2 py-1.5 font-medium text-black dark:text-white">{d.name}</td>
                    <td className="px-2 py-1.5">{d.headcount}</td>
                    <td className="px-2 py-1.5">{d.activeTasks}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-12 rounded-full bg-gray-200 dark:bg-gray-700">
                          <div className="h-full rounded-full bg-green-500" style={{ width: `${d.completionRate}%` }} />
                        </div>
                        <span>{d.completionRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-xs text-gray-400">No department data available</p>
        )}
      </div>
    </div>
  );
}
