"use client";
import { useEffect, useState } from "react";
import BarChartWrapper from "./BarChartWrapper";

export default function CustomerChart() {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("api/sales-stats/tempStats/temp1");
        if (!res.ok) {
          throw new Error("Failed to fetc sales data");
        }
        const data = await res.json();
        setChartData(data);
      } catch (err) {
        setError("Error fetching data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center">
        <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"></div>
        <span className="ml-2">Loading custchart data...</span>
      </div>
    );
  if (error) return <div>Error: (error)</div>;
  if (!chartData) return null;

  return (
    // <div className="dark:bg-boxdark border-stroke dark:border-strokedark shadow-default m-auto h-[280px] w-full rounded-lg border bg-white p-2 md:h-[380px] md:w-lg">
    <div className="border-stroke dark:border-strokedark shadow-default h-[350px] w-full rounded-lg border bg-white p-2 dark:bg-[#d4dce6]">
      <BarChartWrapper data={chartData} title="Customer Chart Example"/>
    </div>
  );
}
