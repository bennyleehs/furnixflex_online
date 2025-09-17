//v1.2 -gemini
// src/components/SalesCard/SaleConversion.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import SalesDataStats from "./SalesDataStats";

const getCurrentMonthYear = () => {
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = {
    month: "long",
    year: "numeric",
  };
  const formattedString = today.toLocaleDateString("en-US", options);
  return formattedString.toUpperCase();
};

export default function SalesConversion() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversionData, setConversionData] = useState({
    quotationLeads: 0,
    paymentLeads: 0,
    rate: "0.00%",
  });
  const hasFetchedData = useRef(false);
  const monthYear = getCurrentMonthYear();

  const uid = user?.uid;

  const fetchData = async () => {
    if (!uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const today = new Date();
    const currentMonth = today.getMonth() + 1; // getMonth() is 0-indexed
    const currentYear = today.getFullYear();

    try {
      const res = await fetch(
        `/api/sales-stats/sales-conversion?uid=${uid}&month=${currentMonth}&year=${currentYear}`,
      );

      if (!res.ok) {
        throw new Error("Failed to fetch sales conversion data");
      }

      const data = await res.json();
      // Use the nullish coalescing operator to default to 0
      const quotationLeads = data.quotationLeads ?? 0;
      const paymentLeads = data.paymentLeads ?? 0;

      const rate =
        quotationLeads > 0
          ? ((paymentLeads / quotationLeads) * 100).toFixed(2) + "%"
          : "0.00%";

      setConversionData({
        quotationLeads,
        paymentLeads,
        rate,
      });
    } catch (err) {
      console.error("Error fetching sales data:", err);
      setError("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && !hasFetchedData.current && uid) {
      fetchData();
      hasFetchedData.current = true;
    }
  }, [uid, isAuthLoading]);

  // Handle different states: loading, error, and success
  if (isAuthLoading || loading) {
    return (
      <div className="dark:bg-boxdark border-stroke dark:border-strokedark shadow-default rounded-lg border bg-white p-4">
        <h1 className="mb-4 text-xl font-semibold text-black dark:text-white">
          Sales Conversion
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading data...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dark:bg-boxdark border-stroke dark:border-strokedark shadow-default rounded-lg border bg-white p-4">
        <h1 className="mb-4 text-xl font-semibold text-black dark:text-white">
          Sales Conversion
        </h1>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="dark:bg-boxdark border-stroke dark:border-strokedark shadow-default rounded-lg border bg-white px-4 py-4">
      <h1 className="mb-4 text-xl font-semibold text-black dark:text-white">
        Sales Conversion
      </h1>
      <SalesDataStats
        total={`${conversionData.quotationLeads}/${conversionData.paymentLeads}`}
        titleMonthYear={monthYear}
        children={
          <svg
            className="stroke-primary"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 9h.01M15 15h.01M16 8l-8 8M7.334 3.819a3.83 3.83 0 0 0 2.18-.904 3.83 3.83 0 0 1 4.972 0c.613.523 1.376.84 2.18.904a3.83 3.83 0 0 1 3.515 3.515 3.82 3.82 0 0 0 .904 2.18 3.83 3.83 0 0 1 0 4.972 3.83 3.83 0 0 0-.904 2.18 3.83 3.83 0 0 1-3.515 3.515 3.83 3.83 0 0 0-2.18.904 3.83 3.83 0 0 1-4.972 0 3.83 3.83 0 0 0-2.18-.904 3.83 3.83 0 0 1-3.515-3.515 3.83 3.83 0 0 0-.904-2.18 3.83 3.83 0 0 1 0-4.972c.523-.613.84-1.376.904-2.18a3.83 3.83 0 0 1 3.515-3.515M9.5 9a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0m6 6a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"
              fill=""
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
        title="Total Quotations / Total Payments"
        rate={conversionData.rate}
        levelUp
      ></SalesDataStats>
    </div>
  );
}
