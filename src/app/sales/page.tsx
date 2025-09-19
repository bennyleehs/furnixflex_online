// import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
// import ComingSoon from "@/components/DisplayPage/ComingSoon";
// import DefaultLayout from "@/components/Layouts/DefaultLayout";

// export default function Sales() {
//   return (
//     <DefaultLayout>
//       <Breadcrumb pageName="Sales Menu" noHeader/>
//       <ComingSoon />
//     </DefaultLayout>
//   );
// }

"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

export default function Home() {
  // Project phases data
  const [projectPhases, setProjectPhases] = useState([
    {
      name: "Phase 1: Core Functionality",
      status: "completed",
      startDate: "2025-05-01",
      endDate: "2025-06-30",
      progress: 73,
      tasks: [
        {
          name: "API Endpoint Integration",
          status: "completed",
          dueDate: "2025-05-15",
        },
        {
          name: "Quotation System Refinements",
          status: "completed",
          dueDate: "2025-05-30",
        },
        {
          name: "Transaction Flow Implementation",
          status: "completed",
          dueDate: "2025-06-15",
        },
      ],
    },
    {
      name: "Phase 2: Products & Quotation Management",
      status: "in-progress",
      startDate: "2025-05-6",
      endDate: "2025-05-9",
      progress: 60,
      tasks: [
        {
          name: "Products Management System",
          status: "in-progress",
          dueDate: "2025-05-9",
        },
        {
          name: "Quotation Management Module",
          status: "in-progress",
          dueDate: "2025-05-9",
        },
        {
          name: "Basic Reporting Functionality",
          status: "pending",
          dueDate: "2025-05-9",
        },
      ],
    },
    {
      name: "Phase 3: Account Features",
      status: "pending",
      startDate: "2025-06-01",
      endDate: "2025-06-15",
      progress: 0,
      tasks: [
        { name: "Account Reporting", status: "pending", dueDate: "2025-06-5" },
        {
          name: "Statement Optimizations",
          status: "pending",
          dueDate: "2025-06-10",
        },
        {
          name: "Integration Capabilities",
          status: "pending",
          dueDate: "2025-06-15",
        },
      ],
    },
    {
      name: "Phase 4: Deployment",
      status: "pending",
      startDate: "2025-06-15",
      endDate: "2025-06-25",
      progress: 0,
      tasks: [
        { name: "Testing & QA", status: "pending", dueDate: "2025-06-15" },
        {
          name: "Documentation & Training",
          status: "pending",
          dueDate: "2025-06-20",
        },
        {
          name: "Production Deployment",
          status: "pending",
          dueDate: "2025-06-25",
        },
      ],
    },
  ]);

  // Sales/quotation statistics
  const [salesStats, setSalesStats] = useState({
    drafts: 18,
    sent: 24,
    accepted: 14,
    rejected: 6,
  });

  // Job statistics
  const [jobStats, setJobStats] = useState({
    expired: 5,
    nearExpiry: 12,
    active: 28,
  });

  // Calculate overall project progress
  const overallProgress = Math.round(
    projectPhases.reduce((acc, phase) => acc + phase.progress, 0) /
      projectPhases.length,
  );

  // Calculate days remaining until final deadline
  const calculateDaysRemaining = () => {
    const lastPhase = projectPhases[projectPhases.length - 1];
    const endDate = new Date(lastPhase.endDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = calculateDaysRemaining();

  // Format date for display
  interface DateFormatOptions {
    year: "numeric" | "2-digit";
    month: "numeric" | "2-digit" | "long" | "short" | "narrow";
    day: "numeric" | "2-digit";
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const options: DateFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  // Chart data for project progress
  const projectProgressData = {
    labels: projectPhases.map((phase) => phase.name.split(":")[0]),
    datasets: [
      {
        label: "Progress (%)",
        data: projectPhases.map((phase) => phase.progress),
        backgroundColor: "#3B82F6",
        borderRadius: 8,
      },
    ],
  };

  // Chart data for sales statistics
  const salesChartData = {
    labels: ["Drafts", "Sent", "Accepted", "Rejected"],
    datasets: [
      {
        data: [
          salesStats.drafts,
          salesStats.sent,
          salesStats.accepted,
          salesStats.rejected,
        ],
        backgroundColor: ["#94A3B8", "#3B82F6", "#22C55E", "#EF4444"],
        borderColor: ["#ffffff", "#ffffff", "#ffffff", "#ffffff"],
        borderWidth: 1,
      },
    ],
  };

  // Chart data for job statistics
  const jobChartData = {
    labels: ["Expired", "Upcoming (3 Weeks)", "Active"],
    datasets: [
      {
        data: [jobStats.expired, jobStats.nearExpiry, jobStats.active],
        backgroundColor: ["#CE3B27", "#FCC55A", "#4ADE80"],
        borderColor: ["#ffffff", "#ffffff", "#ffffff"],
        borderWidth: 1,
      },
    ],
  };

  return (
    <>
      <Head>
        <title>Dashboard | ClassyPro Portal</title>
        <meta
          name="description"
          content="Project progress and sales dashboard for ClassyPro"
        />
      </Head>
      <DefaultLayout>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-black dark:text-white">
            Sales Dashboard
          </h2>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2  xl:grid-cols-4">
          {/* Overall Progress */}
          <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-lg border bg-white px-7.5 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold text-black dark:text-white">
                  {overallProgress}%
                </h4>
                <span className="text-sm font-medium">
                  Overall Project Progress
                </span>
              </div>
              <div className="bg-meta-2 dark:bg-meta-4 flex h-12 w-12 items-center justify-center rounded-full">
                <svg
                  className="fill-primary dark:fill-white"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"></path>
                  <path
                    d="M12,20V22A10,10 0 0,0 22,12H20A8,8 0 0,1 12,20Z"
                    opacity="0.5"
                  ></path>
                </svg>
              </div>
            </div>
          </div>

          {/* Days Remaining */}
          <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-lg border bg-white px-7.5 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold text-black dark:text-white">
                  {daysRemaining}
                </h4>
                <span className="text-sm font-medium">
                  Days Until Completion
                </span>
              </div>
              <div className="bg-meta-2 dark:bg-meta-4 flex h-12 w-12 items-center justify-center rounded-full">
                <svg
                  className="fill-primary dark:fill-white"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"></path>
                </svg>
              </div>
            </div>
          </div>

          {/* Quotations */}
          <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-lg border bg-white px-7.5 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold text-black dark:text-white">
                  {salesStats.accepted + salesStats.sent + salesStats.drafts}
                </h4>
                <span className="text-sm font-medium">Active Quotations</span>
              </div>
              <div className="bg-meta-2 dark:bg-meta-4 flex h-12 w-12 items-center justify-center rounded-full">
                <svg
                  className="fill-primary dark:fill-white"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path d="M3,22V8H7V22H3M10,22V2H14V22H10M17,22V14H21V22H17Z"></path>
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <span className="text-success text-sm font-medium">
                  {salesStats.accepted}
                </span>
                <span className="text-xs"> Accepted</span>
              </div>
            </div>
          </div>

          {/* Jobs */}
          <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-lg border bg-white px-7.5 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold text-black dark:text-white">
                  {jobStats.expired + jobStats.nearExpiry + jobStats.active}
                </h4>
                <span className="text-sm font-medium">Total Jobs</span>
              </div>
              <div className="bg-meta-2 dark:bg-meta-4 flex h-12 w-12 items-center justify-center rounded-full">
                <svg
                  className="fill-primary dark:fill-white"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path d="M19,3H5C3.9,3 3,3.9 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M9,17H7V10H9V17M13,17H11V7H13V17M17,17H15V13H17V17Z"></path>
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <span className="text-danger text-sm font-medium">
                  {jobStats.expired}
                </span>
                <span className="text-xs"> Expired</span>
              </div>
              <div>
                <span className="text-warning text-sm font-medium">
                  {jobStats.nearExpiry}
                </span>
                <span className="text-xs"> Upcoming</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        {/* <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6"> */}
          {/* Status Charts */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Job Status Chart */}
            <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-lg border bg-white p-6">
              <h4 className="mb-2 text-lg font-semibold text-black dark:text-white">
                Job Status
              </h4>
              <div className="flex h-40 justify-center">
                <Doughnut
                  data={jobChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "bottom",
                        labels: {
                          boxWidth: 12,
                          padding: 10,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Sales Status Chart */}
            <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-lg border bg-white p-6">
              <h4 className="mb-2 text-lg font-semibold text-black dark:text-white">
                Quotation Status
              </h4>
              <div className="flex h-40 justify-center">
                <Doughnut
                  data={salesChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "bottom",
                        labels: {
                          boxWidth: 12,
                          padding: 10,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        {/* </div> */}
      </DefaultLayout>
    </>
  );
}
