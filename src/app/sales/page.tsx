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
        <div className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6 2xl:p-10">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-black dark:text-white">
              Sales Dashboard
            </h2>
          </div>

          {/* Stats Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5">
            {/* Overall Progress */}
            <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-xs border bg-white px-7.5 py-6">
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
            <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-xs border bg-white px-7.5 py-6">
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
            <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-xs border bg-white px-7.5 py-6">
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
            <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-xs border bg-white px-7.5 py-6">
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
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            {/* Project Progress Chart */}
            <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-xs border bg-white p-6">
              <h4 className="mb-6 text-xl font-semibold text-black dark:text-white">
                Project Progress by Phase
              </h4>
              <div className="h-80">
                <Bar
                  data={projectProgressData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                          callback: (value) => `${value}%`,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Status Charts */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Job Status Chart */}
              <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-xs border bg-white p-6">
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
              <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-xs border bg-white p-6">
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
          </div>

          {/* Project Timeline */}
          <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark mb-6 rounded-xs border bg-white p-6">
            <h4 className="mb-6 text-xl font-semibold text-black dark:text-white">
              Project Timeline
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 dark:bg-meta-4 text-left">
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Phase
                    </th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Status
                    </th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Timeline
                    </th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Progress
                    </th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Key Tasks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projectPhases.map((phase, index) => (
                    <tr
                      key={index}
                      className="border-stroke dark:border-strokedark border-b"
                    >
                      <td className="px-4 py-5">
                        <h5 className="font-medium text-black dark:text-white">
                          {phase.name}
                        </h5>
                      </td>
                      <td className="px-4 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                            phase.status === "completed"
                              ? "bg-success/10 text-success"
                              : phase.status === "in-progress"
                                ? "bg-primary/10 text-primary"
                                : "bg-gray-2 text-gray-6 dark:bg-meta-4 dark:text-gray-3"
                          }`}
                        >
                          {phase.status === "completed"
                            ? "Completed"
                            : phase.status === "in-progress"
                              ? "In Progress"
                              : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <p className="text-sm">
                          {formatDate(phase.startDate)} -{" "}
                          {formatDate(phase.endDate)}
                        </p>
                      </td>
                      <td className="px-4 py-5">
                        <div className="bg-gray-2 dark:bg-meta-4 h-2 w-full rounded-full">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${phase.progress}%` }}
                          ></div>
                        </div>
                        <p className="mt-1 text-right text-xs">
                          {phase.progress}%
                        </p>
                      </td>
                      <td className="px-4 py-5">
                        <ul className="list-inside list-disc text-sm">
                          {phase.tasks.map((task, taskIndex) => (
                            <li
                              key={taskIndex}
                              className={`${
                                task.status === "completed"
                                  ? "text-success"
                                  : task.status === "in-progress"
                                    ? "text-primary"
                                    : "text-gray-6 dark:text-gray-4"
                              }`}
                            >
                              {task.name}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Outstanding Tasks */}
          <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark mb-6 rounded-xs border bg-white p-6">
            <h4 className="mb-6 text-xl font-semibold text-black dark:text-white">
              Outstanding Tasks & Development Schedule
            </h4>

            <div className="mb-6">
              <h5 className="mb-3 text-lg font-medium text-black dark:text-white">
                High Priority (Immediate)
              </h5>
              <ul className="list-inside list-disc space-y-2 pl-2">
                <li className="font-medium">
                  API Endpoint Integration
                  <ul className="list-circle mt-1 mb-2 ml-6 list-inside text-sm font-normal text-gray-600 dark:text-gray-400">
                    <li>Fix missing /api/sales/quotation/list endpoint</li>
                    <li>
                      Implement /api/sales/quotation/status endpoint for status
                      updates
                    </li>
                  </ul>
                </li>
                <li className="font-medium">
                  Quotation System Refinements
                  <ul className="list-circle mt-1 mb-2 ml-6 list-inside text-sm font-normal text-gray-600 dark:text-gray-400">
                    <li>Fix issue with quotation numbers not displaying</li>
                    <li>
                      Resolve data inconsistency between snake_case and
                      camelCase properties
                    </li>
                    <li>Complete PDF generation functionality</li>
                  </ul>
                </li>
                <li className="font-medium">
                  Transaction Flow Implementation
                  <ul className="list-circle mt-1 mb-2 ml-6 list-inside text-sm font-normal text-gray-600 dark:text-gray-400">
                    <li>Create invoice generation from accepted quotations</li>
                    <li>Implement payment tracking system</li>
                  </ul>
                </li>
              </ul>
            </div>

            <div className="mb-6">
              <h5 className="mb-3 text-lg font-medium text-black dark:text-white">
                Medium Priority (Next Phase)
              </h5>
              <ul className="list-inside list-disc space-y-2 pl-2">
                <li className="font-medium">
                  Inventory Management
                  <ul className="list-circle mt-1 mb-2 ml-6 list-inside text-sm font-normal text-gray-600 dark:text-gray-400">
                    <li>Stock level tracking when products are ordered</li>
                    <li>Low stock alerts</li>
                    <li>Inventory adjustment interface</li>
                  </ul>
                </li>
                <li className="font-medium">
                  Customer Management
                  <ul className="list-circle mt-1 mb-2 ml-6 list-inside text-sm font-normal text-gray-600 dark:text-gray-400">
                    <li>Customer database with history</li>
                    <li>Customer portal access</li>
                  </ul>
                </li>
                <li className="font-medium">
                  Reporting System
                  <ul className="list-circle mt-1 mb-2 ml-6 list-inside text-sm font-normal text-gray-600 dark:text-gray-400">
                    <li>Sales performance reports</li>
                    <li>Product performance analytics</li>
                    <li>Financial reporting</li>
                  </ul>
                </li>
              </ul>
            </div>

            <div className="mb-6">
              <h5 className="mb-3 text-lg font-medium text-black dark:text-white">
                Future Enhancements
              </h5>
              <ul className="list-inside list-disc space-y-2 pl-2">
                <li className="font-medium">
                  Mobile Optimization
                  <ul className="list-circle mt-1 mb-2 ml-6 list-inside text-sm font-normal text-gray-600 dark:text-gray-400">
                    <li>Touch-friendly interfaces for field staff</li>
                    <li>Responsive design improvements</li>
                  </ul>
                </li>
                <li className="font-medium">
                  Integration Capabilities
                  <ul className="list-circle mt-1 mb-2 ml-6 list-inside text-sm font-normal text-gray-600 dark:text-gray-400">
                    <li>Accounting software integration</li>
                    <li>CRM synchronization</li>
                    <li>Email marketing integration</li>
                  </ul>
                </li>
              </ul>
            </div>

            <div className="mb-6">
              <h5 className="mb-3 text-lg font-medium text-black dark:text-white">
                Development Schedule
              </h5>
              <div className="grid grid-cols-1 gap-y-4 px-2">
                <div className="border-primary relative border-l-2 pl-4">
                  <div className="bg-primary absolute top-1 -left-[7px] h-3 w-3 rounded-full"></div>
                  <h6 className="font-medium text-black dark:text-white">
                    Phase 1 (May-June 2025)
                  </h6>
                  <ul className="mt-1 list-inside list-disc text-sm text-gray-600 dark:text-gray-400">
                    <li>Complete all high-priority tasks</li>
                    <li>Fix existing bugs in quotation system</li>
                    <li>Implement core transaction flow</li>
                  </ul>
                </div>

                <div className="border-primary relative border-l-2 pl-4">
                  <div className="bg-primary absolute top-1 -left-[7px] h-3 w-3 rounded-full"></div>
                  <h6 className="font-medium text-black dark:text-white">
                    Phase 2 (July-August 2025)
                  </h6>
                  <ul className="mt-1 list-inside list-disc text-sm text-gray-600 dark:text-gray-400">
                    <li>Develop inventory management system</li>
                    <li>Create customer management module</li>
                    <li>Build basic reporting functionality</li>
                  </ul>
                </div>

                <div className="border-primary relative border-l-2 pl-4">
                  <div className="bg-primary absolute top-1 -left-[7px] h-3 w-3 rounded-full"></div>
                  <h6 className="font-medium text-black dark:text-white">
                    Phase 3 (September-October 2025)
                  </h6>
                  <ul className="mt-1 list-inside list-disc text-sm text-gray-600 dark:text-gray-400">
                    <li>Advanced reporting and analytics</li>
                    <li>Mobile optimizations</li>
                    <li>Integration capabilities</li>
                    <li>User experience refinements</li>
                  </ul>
                </div>

                <div className="border-primary relative border-l-2 pl-4">
                  <div className="bg-primary absolute top-1 -left-[7px] h-3 w-3 rounded-full"></div>
                  <h6 className="font-medium text-black dark:text-white">
                    Phase 4 (November-December 2025)
                  </h6>
                  <ul className="mt-1 list-inside list-disc text-sm text-gray-600 dark:text-gray-400">
                    <li>Comprehensive testing</li>
                    <li>Performance optimization</li>
                    <li>Documentation</li>
                    <li>Staff training</li>
                    <li>Full production deployment</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h5 className="mb-3 text-lg font-medium text-black dark:text-white">
                Weekly Milestones (Immediate Plan)
              </h5>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-2 dark:bg-meta-4 text-left">
                      <th className="px-4 py-3 font-medium text-black dark:text-white">
                        Week
                      </th>
                      <th className="px-4 py-3 font-medium text-black dark:text-white">
                        Focus
                      </th>
                      <th className="px-4 py-3 font-medium text-black dark:text-white">
                        Deliverables
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-stroke dark:border-strokedark border-b">
                      <td className="px-4 py-3 text-black dark:text-white">
                        Week 1
                      </td>
                      <td className="px-4 py-3">API Endpoints</td>
                      <td className="px-4 py-3">
                        Fix API endpoints and quotation display issues
                      </td>
                    </tr>
                    <tr className="border-stroke dark:border-strokedark border-b">
                      <td className="px-4 py-3 text-black dark:text-white">
                        Week 2
                      </td>
                      <td className="px-4 py-3">PDF Generation</td>
                      <td className="px-4 py-3">
                        Complete PDF generation and email functionality
                      </td>
                    </tr>
                    <tr className="border-stroke dark:border-strokedark border-b">
                      <td className="px-4 py-3 text-black dark:text-white">
                        Week 3
                      </td>
                      <td className="px-4 py-3">Invoice Generation</td>
                      <td className="px-4 py-3">
                        Implement invoice generation from quotations
                      </td>
                    </tr>
                    <tr className="border-stroke dark:border-strokedark border-b">
                      <td className="px-4 py-3 text-black dark:text-white">
                        Week 4
                      </td>
                      <td className="px-4 py-3">Payment Tracking</td>
                      <td className="px-4 py-3">
                        Develop payment tracking system
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-black dark:text-white">
                        Week 5
                      </td>
                      <td className="px-4 py-3">Testing</td>
                      <td className="px-4 py-3">
                        Testing and bug fixes for core functionality
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </DefaultLayout>
    </>
  );
}
