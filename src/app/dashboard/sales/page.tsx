"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCountry } from "@/context/CountryContext";

/** Shifts a UTC HH:MM:SS time string to local time using a "GMT+8" style offset and appends the label. */
function applyTz(time: string | null | undefined, tz: string): string {
  if (!time) return "--:--";
  const m = tz.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/i);
  if (!m) return time.slice(0, 5);
  const offset = (m[1] === "+" ? 1 : -1) * (parseInt(m[2]) * 60 + parseInt(m[3] ?? "0")) * 60_000;
  const local = new Date(new Date(`1970-01-01T${time}Z`).getTime() + offset).toISOString().slice(11, 16);
  return `${local} (${tz})`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MEDIA_COLORS: Record<string, string> = {
  FB: "bg-cyan-400",
  TikTok: "bg-pink-500",
  "小红书": "bg-red-400",
  Website: "bg-emerald-500",
  "Walk-in": "bg-orange-400",
  Referral: "bg-blue-500",
  Dealer: "bg-indigo-400",
  Other: "bg-pink-300",
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value}`;
}

interface DashboardStats {
  totalLeads: number;
  totalDeals: number;
  conversionRate: string;
  salesYtd: number;
  revenueYtd: number;
  revenueCollectedPct: string;
  outstanding: number;
  backlogYtd: number;
  backlogCount: number;
  backlogDealPct: string;
}

interface MonthData {
  month: number;
  leads?: number;
  deals?: number;
  sales_total?: number;
  revenue_total?: number;
  source?: string;
  count?: number;
}

interface BacklogItem {
  id: number;
  invoiceCode: string;
  quotation_grand_total: number;
  outstanding_amount: number;
  quotation_status: string;
  month: number;
}

interface AttendanceRecord {
  id: number;
  checkin_time: string | null;
  checkout_time: string | null;
  checkin_address: string | null;
  checkout_address: string | null;
  tracking_date: string;
}

export default function SalesUserDashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { country } = useCountry();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leadsVsDeals, setLeadsVsDeals] = useState<MonthData[]>([]);
  const [salesByMonth, setSalesByMonth] = useState<MonthData[]>([]);
  const [revenueByMonth, setRevenueByMonth] = useState<MonthData[]>([]);
  const [mediaToDeals, setMediaToDeals] = useState<MonthData[]>([]);
  const [backlogDetails, setBacklogDetails] = useState<BacklogItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!isAuthLoading && user?.uid && !hasFetched.current) {
      hasFetched.current = true;
      fetchDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, user?.uid]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/sales-user?uid=${user?.uid}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStats(data.stats);
      setLeadsVsDeals(data.leadsVsDeals);
      setSalesByMonth(data.salesByMonth);
      setRevenueByMonth(data.revenueByMonth);
      setMediaToDeals(data.mediaToDeals);
      setBacklogDetails(data.backlogDetails);
      setAttendance(data.attendance);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  };

  const handleCheckIn = useCallback(async () => {
    if (!user?.uid || checkingIn) return;
    setCheckingIn(true);
    try {
      const location = await getLocation();
      const res = await fetch("/api/admin/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          latitude: location?.latitude || null,
          longitude: location?.longitude || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAttendance(data.record);
      }
    } catch (err) {
      console.error("Check-in error:", err);
    } finally {
      setCheckingIn(false);
    }
  }, [user?.uid, checkingIn]);

  const handleCheckOut = useCallback(async () => {
    if (!user?.uid || checkingOut) return;
    setCheckingOut(true);
    try {
      const location = await getLocation();
      const res = await fetch("/api/admin/attendance/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          latitude: location?.latitude || null,
          longitude: location?.longitude || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAttendance(data.record);
      }
    } catch (err) {
      console.error("Check-out error:", err);
    } finally {
      setCheckingOut(false);
    }
  }, [user?.uid, checkingOut]);

  if (isAuthLoading || loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading dashboard...</span>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();

  // Build monthly data for charts
  const currentMonth = new Date().getMonth() + 1;
  const activeMonths = MONTHS.slice(0, currentMonth);

  // Leads vs Deals chart data
  const leadsMap = new Map(leadsVsDeals.map((d) => [d.month, d]));
  const leadsChartData = activeMonths.map((_, i) => leadsMap.get(i + 1)?.leads || 0);
  const dealsChartData = activeMonths.map((_, i) => leadsMap.get(i + 1)?.deals || 0);
  const maxLeads = Math.max(...leadsChartData, 1);

  // Sales vs Revenue chart data
  const salesMap = new Map(salesByMonth.map((d) => [d.month, d.sales_total || 0]));
  const revenueMap = new Map(revenueByMonth.map((d) => [d.month, d.revenue_total || 0]));
  const salesChartData = activeMonths.map((_, i) => salesMap.get(i + 1) || 0);
  const revenueChartData = activeMonths.map((_, i) => revenueMap.get(i + 1) || 0);
  const maxSalesRev = Math.max(...salesChartData, ...revenueChartData, 1);

  // Media to Deals
  const mediaByMonth = new Map<number, Record<string, number>>();
  const allSources = new Set<string>();
  mediaToDeals.forEach((d) => {
    const src = d.source || "Other";
    allSources.add(src);
    if (!mediaByMonth.has(d.month)) mediaByMonth.set(d.month, {});
    const m = mediaByMonth.get(d.month)!;
    m[src] = (m[src] || 0) + (d.count || 0);
  });
  const sourceList = Array.from(allSources);
  const mediaTotalsByMonth = activeMonths.map((_, i) => {
    const m = mediaByMonth.get(i + 1) || {};
    return Object.values(m).reduce((a, b) => a + b, 0);
  });

  // Backlog by month (count + amount)
  const backlogCountByMonth = new Map<number, number>();
  const backlogAmountByMonth = new Map<number, number>();
  backlogDetails.forEach((b) => {
    backlogCountByMonth.set(b.month, (backlogCountByMonth.get(b.month) || 0) + 1);
    const amt = typeof b.outstanding_amount === 'string' ? parseFloat(b.outstanding_amount) : (b.outstanding_amount || 0);
    backlogAmountByMonth.set(b.month, (backlogAmountByMonth.get(b.month) || 0) + amt);
  });

  return (
    <>
      {/* Attendance row */}
      <div className="mb-4 flex items-center gap-3">
        {!attendance?.checkin_time ? (
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            {checkingIn ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            )}
            Check In
          </button>
        ) : !attendance?.checkout_time ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-900/30 px-3 py-1.5 text-xs text-emerald-400">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              In {applyTz(attendance.checkin_time, country.timeZone)} &middot; {attendance.checkin_address}
            </span>
            <button
              onClick={handleCheckOut}
              disabled={checkingOut}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              {checkingOut ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
              Check Out
            </button>
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-800/50 px-3 py-1.5 text-xs text-gray-400">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            In {applyTz(attendance.checkin_time, country.timeZone)} &middot; Out {applyTz(attendance.checkout_time, country.timeZone)}
          </span>
        )}
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="TOTAL LEADS (YTD)"
          value={stats?.totalLeads?.toLocaleString() || "0"}
          subtitle={`Handle by: ${user?.name || user?.uid || "—"}`}
          gradient="from-blue-600 to-cyan-500"
        />
        <StatCard
          title="TOTAL DEALS (YTD)"
          value={stats?.totalDeals?.toLocaleString() || "0"}
          subtitle={stats?.conversionRate || "0% conversion"}
          gradient="from-purple-500 to-pink-500"
        />
        <StatCard
          title="SALES (YTD)"
          value={formatCurrency(stats?.salesYtd || 0)}
          subtitle="Year to date"
          gradient="from-cyan-500 to-teal-400"
        />
        <StatCard
          title="REVENUE (YTD)"
          value={formatCurrency(stats?.revenueYtd || 0)}
          subtitle={`${stats?.revenueCollectedPct || "0"}% collected`}
          gradient="from-green-500 to-emerald-400"
        />
        <StatCard
          title="OUTSTANDING"
          value={formatCurrency(stats?.outstanding || 0)}
          subtitle="Pending"
          gradient="from-yellow-500 to-orange-400"
        />
        <StatCard
          title="BACKLOG (YTD)"
          value={formatCurrency(stats?.backlogYtd || 0)}
          subtitle={`${stats?.backlogCount || 0} cases · ${stats?.backlogDealPct || "0"}% of deals`}
          gradient="from-orange-500 to-red-500"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {/* Leads vs Deals */}
        <div className="rounded-xl border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-lg">👥</span>
            <div>
              <h3 className="font-bold text-black dark:text-white">Leads vs Deals</h3>
              <p className="text-xs uppercase tracking-wide text-gray-500">Monthly Conversion</p>
            </div>
          </div>
          <div className="space-y-3">
            {activeMonths.map((month, i) => {
              const leads = leadsChartData[i];
              const deals = dealsChartData[i];
              if (leads === 0 && deals === 0) return null;
              return (
                <div key={month} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-medium text-gray-500 dark:text-gray-400">{month}</span>
                  <div className="flex flex-1 items-center gap-1">
                    <div
                      className="flex h-7 items-center justify-center rounded bg-gradient-to-r from-blue-500 to-cyan-400 text-xs font-bold text-white transition-all"
                      style={{ width: `${Math.max((leads / maxLeads) * 100, 4)}%`, minWidth: "24px" }}
                    >
                      {leads}
                    </div>
                    {deals > 0 && (
                      <div
                        className="flex h-7 items-center justify-center rounded bg-gradient-to-r from-pink-500 to-rose-400 text-xs font-bold text-white"
                        style={{ width: `${Math.max((deals / maxLeads) * 100, 3)}%`, minWidth: "24px" }}
                      >
                        {deals}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-gradient-to-r from-blue-500 to-cyan-400" /> Leads
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-gradient-to-r from-pink-500 to-rose-400" /> Deals
            </span>
          </div>
        </div>

        {/* Sales vs Revenue */}
        <div className="rounded-xl border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-lg">💰</span>
            <div>
              <h3 className="font-bold text-black dark:text-white">Sales vs Revenue</h3>
              <p className="text-xs uppercase tracking-wide text-gray-500">Monthly Comparison</p>
            </div>
          </div>
          <div className="space-y-3">
            {activeMonths.map((month, i) => {
              const sales = salesChartData[i];
              const revenue = revenueChartData[i];
              if (sales === 0 && revenue === 0) return null;
              return (
                <div key={month} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-medium text-gray-500 dark:text-gray-400">{month}</span>
                  <div className="flex flex-1 items-center gap-2">
                    {sales > 0 && (
                      <span className="inline-flex items-center rounded bg-gradient-to-r from-blue-500 to-cyan-400 px-2 py-1 text-xs font-bold text-white">
                        {formatCurrency(sales)}
                      </span>
                    )}
                    {revenue > 0 && (
                      <span className="inline-flex items-center rounded bg-gradient-to-r from-emerald-400 to-teal-400 px-2 py-1 text-xs font-bold text-white">
                        {formatCurrency(revenue)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-gradient-to-r from-blue-500 to-cyan-400" /> Sales (Monthly)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-gradient-to-r from-emerald-400 to-teal-400" /> Revenue (Monthly)
            </span>
          </div>
        </div>

        {/* Media to Deals */}
        <div className="rounded-xl border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-lg">📱</span>
            <div>
              <h3 className="font-bold text-black dark:text-white">Media to Deals</h3>
              <p className="text-xs uppercase tracking-wide text-gray-500">Source Performance by Month</p>
            </div>
          </div>
          <div className="space-y-3">
            {activeMonths.map((month, i) => {
              const monthData = mediaByMonth.get(i + 1) || {};
              const total = mediaTotalsByMonth[i];
              if (total === 0) return null;
              return (
                <div key={month} className="flex items-center gap-3">
                  <div className="w-8">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{month}</span>
                    <div className="text-lg font-bold text-cyan-400">{total}</div>
                  </div>
                  <div className="flex flex-1 items-center gap-0.5">
                    {sourceList.map((src) => {
                      const count = monthData[src] || 0;
                      if (count === 0) return null;
                      const color = MEDIA_COLORS[src] || "bg-gray-400";
                      return (
                        <div
                          key={src}
                          className={`flex h-7 items-center justify-center rounded text-xs font-bold text-white ${color}`}
                          style={{ width: `${Math.max((count / total) * 100, 10)}%`, minWidth: "28px" }}
                          title={`${src}: ${count}`}
                        >
                          {count}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            {sourceList.map((src) => (
              <span key={src} className="flex items-center gap-1">
                <span className={`inline-block h-3 w-3 rounded ${MEDIA_COLORS[src] || "bg-gray-400"}`} /> {src}
              </span>
            ))}
          </div>
        </div>

        {/* Backlog Details */}
        <div className="rounded-xl border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-lg">📋</span>
            <div>
              <h3 className="font-bold text-black dark:text-white">Backlog Details</h3>
              <p className="text-xs uppercase tracking-wide text-gray-500">YTD Overview</p>
            </div>
          </div>
          {/* Backlog by month */}
          <div className="mb-4 space-y-3">
            {activeMonths.map((month, i) => {
              const count = backlogCountByMonth.get(i + 1) || 0;
              const amount = backlogAmountByMonth.get(i + 1) || 0;
              if (count === 0) return null;
              return (
                <div key={month} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-medium text-gray-500 dark:text-gray-400">{month}</span>
                  <div className="flex flex-1 items-center gap-2">
                    <span className="inline-flex items-center rounded bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-1 text-xs font-bold text-white">
                      {formatCurrency(amount)}
                    </span>
                    <span className="inline-flex items-center rounded bg-gradient-to-r from-orange-400 to-amber-400 px-2 py-1 text-xs font-bold text-white">
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Quotation list */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Quotations</h4>
            <div className="flex flex-wrap gap-1.5">
              {backlogDetails.map((item) => (
                <span
                  key={item.id}
                  className="inline-block rounded bg-gradient-to-r from-purple-500/80 to-pink-500/80 px-2 py-0.5 text-[10px] font-medium text-white"
                  title={`${item.invoiceCode} - ${formatCurrency(item.quotation_grand_total)} (${item.quotation_status})`}
                >
                  {item.invoiceCode}
                </span>
              ))}
              {backlogDetails.length === 0 && (
                <span className="text-xs text-gray-500">No pending quotations</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  gradient,
}: {
  title: string;
  value: string;
  subtitle: string;
  gradient: string;
}) {
  return (
    <div className={`rounded-xl bg-gradient-to-r ${gradient} p-4 text-center text-white shadow-lg`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">{title}</p>
      <p className="my-1 text-2xl font-black sm:text-3xl">{value}</p>
      <p className="text-[10px] opacity-80">{subtitle}</p>
    </div>
  );
}
