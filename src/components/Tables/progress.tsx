import React, { useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
// import "./styles.css"; // Import the CSS file

interface ProgressTableProps {
  data: any[];
  statusCounts: Record<string, number>;
  totalItems: number;
  pageName: string;
}

export default function ProgressTable({
  data,
  statusCounts,
  totalItems,
  pageName,
}: ProgressTableProps) {
  // Memoize the pipeline stages array
  const pipelineStages = useMemo(
    () => [
      "Assign PIC",
      "Follow Up",
      "Visit Showroom",
      "Quotation",
      "Deposit",
      "Production",
      "Installation",
      "Job Done",
    ],
    [],
  ); // Empty dependency array since stages are static

  // State for task filtering
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  // Add a new state for PIC filtering
  const [selectedPIC, setSelectedPIC] = useState<string | null>(null);
  // Add this after the existing useState declarations
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Extract unique PICs from the data
  const uniquePICs = useMemo(() => {
    const picSet = new Set<string>();

    data.forEach((task) => {
      // Extract just the name part from the PIC field if it contains "/"
      const picName = task.pic ? task.pic.split("/")[0].trim() : "Unassigned";
      picSet.add(picName);
    });

    return Array.from(picSet).sort();
  }, [data]);

  // Calculate stage percentages and prepare data
  const stageData = useMemo(() => {
    // Initialize with zeros
    const counts = pipelineStages.reduce(
      (acc, stage) => {
        acc[stage] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Count tasks in each stage
    data.forEach((task) => {
      const status = task.status;
      if (pipelineStages.includes(status)) {
        counts[status]++;
      }
    });

    // Calculate relative position in pipeline for each task
    let totalTasks = 0;
    const stageInfo = pipelineStages.map((stage, index) => {
      const count = counts[stage] || 0;
      totalTasks += count;

      // Percentage of tasks at this stage
      const percentage = totalItems > 0 ? (count / totalItems) * 100 : 0;

      // Progress weighting: earlier stages have less weight in overall progress
      const progressWeight = (index + 1) / pipelineStages.length;
      const weightedProgress = count * progressWeight;

      return {
        stage,
        count,
        percentage,
        progressWeight,
        weightedProgress,
      };
    });

    // Calculate overall pipeline progress
    const totalWeightedProgress = stageInfo.reduce(
      (sum, info) => sum + info.weightedProgress,
      0,
    );
    const maxPossibleProgress = totalTasks * 1; // 1 = maximum stage weight
    const overallProgress =
      maxPossibleProgress > 0
        ? (totalWeightedProgress / maxPossibleProgress) * 100
        : 0;

    return {
      stageInfo,
      overallProgress: Math.round(overallProgress),
    };
  }, [data, totalItems, pipelineStages]);

  // Process individual tasks with progress percentage
  const tasksWithProgress = useMemo(() => {
    return data
      .map((task) => {
        const stageIndex = pipelineStages.indexOf(task.status);
        const progressPercentage =
          stageIndex >= 0
            ? Math.round(((stageIndex + 1) / pipelineStages.length) * 100)
            : 0;

        return {
          ...task,
          progressPercentage,
          stageIndex,
        };
      })
      .sort((a, b) => b.progressPercentage - a.progressPercentage); // Sort by progress descending
  }, [data, pipelineStages]);

  // Update the displayedTasks memo to include search functionality
  const displayedTasks = useMemo(() => {
    let filtered = tasksWithProgress;

    // Apply stage filter if selected
    if (selectedStage) {
      filtered = filtered.filter((task) => task.status === selectedStage);
    }

    // Apply PIC filter if selected
    if (selectedPIC) {
      filtered = filtered.filter((task) => {
        const picName = task.pic ? task.pic.split("/")[0].trim() : "Unassigned";
        return picName === selectedPIC;
      });
    }

    // Apply search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((task) => {
        // Search through all important fields
        return (
          (task.name && task.name.toLowerCase().includes(query)) ||
          (task.contact && task.contact.toLowerCase().includes(query)) ||
          (task.address && task.address.toLowerCase().includes(query)) ||
          (task.source && task.source.toLowerCase().includes(query)) ||
          (task.pic && task.pic.toLowerCase().includes(query)) ||
          (task.id && task.id.toString().includes(query))
        );
      });
    }

    // Limit results if no filters are applied
    if (!selectedStage && !selectedPIC && !searchQuery) {
      filtered = filtered.slice(0, 12);
    }

    return filtered;
  }, [tasksWithProgress, selectedStage, selectedPIC, searchQuery]);

  return (
    <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark mb-5 rounded-lg border bg-gray-50 p-5">
      {/* Header with Pipeline Flow title and breadcrumb on right */}
      <div className="mb-4 flex flex-wrap items-center justify-between">
        {/* Title on left */}
        <h4 className="text-md font-medium">Pipeline Flow</h4>

        {/* Breadcrumb on right */}
        <div className="text-sm">
          <Breadcrumb pageName={pageName} noHeader={true} />
        </div>
      </div>

      {/* Pipeline flow visualization with responsive layout */}
      <div className="mb-6">
        {/* Desktop view - full pipeline */}
        <div className="border-stroke dark:border-strokedark relative mb-1 hidden border-b py-4 md:flex">
          {stageData.stageInfo.map((info, index) => {
            // Determine color based on stage
            let bgColorClass = "bg-primary";
            let textColorClass = "text-white";

            if (info.stage === "Job Done") bgColorClass = "bg-success";
            else if (
              ["Deposit", "Production", "Installation"].includes(info.stage)
            ) {
              bgColorClass = "bg-meta-11";
            }

            return (
              <div
                key={info.stage}
                className="flex min-w-0 flex-1 cursor-pointer flex-col items-center px-1 text-center"
                onClick={() =>
                  setSelectedStage(
                    selectedStage === info.stage ? null : info.stage,
                  )
                }
              >
                {/* Circular count indicator with dark-mode compatible border highlight */}
                <div className="relative">
                  <div
                    className={`h-10 w-10 rounded-full ${bgColorClass} ${textColorClass} flex items-center justify-center text-sm font-medium shadow-md ${
                      selectedStage === info.stage
                        ? `dark:ring-offset-boxdark scale-110 transform ring-4 ring-offset-2 ring-offset-white ${
                            info.stage === "Job Done"
                              ? "ring-success"
                              : [
                                    "Deposit",
                                    "Production",
                                    "Installation",
                                  ].includes(info.stage)
                                ? "ring-meta-11"
                                : "ring-primary"
                          }`
                        : ""
                    } transition-all duration-200`}
                  >
                    {info.count}
                  </div>
                </div>

                {/* Stage connection line */}
                {/* {index < stageData.stageInfo.length - 1 && (
                  <div className="absolute h-0.5 bg-gray-200 dark:bg-gray-600 w-1/2 right-0 top-1/2 transform -translate-y-1/2 -translate-x-1/4"></div>
                )} */}
                {/* {index > 0 && (
                  <div className="absolute h-0.5 bg-gray-200 dark:bg-gray-600 w-1/2 left-0 top-1/2 transform -translate-y-1/2 translate-x-1/4"></div>
                )} */}

                {/* Vertical stage label directly under the circle */}
                <div className="mt-2 flex w-full flex-col items-center text-sm text-black dark:text-white">
                  <span className="font-medium">{index + 1}</span>
                  <span className="w-full truncate text-[13px]">
                    {info.stage}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile view - condensed pipeline */}
        <div className="border-stroke dark:border-strokedark mb-1 flex flex-wrap justify-center gap-6 border-b py-4 md:hidden">
          {stageData.stageInfo.map((info, index) => {
            // Determine color based on stage
            let bgColorClass = "bg-primary";
            let textColorClass = "text-white";

            if (info.stage === "Job Done") bgColorClass = "bg-success";
            else if (
              ["Deposit", "Production", "Installation"].includes(info.stage)
            ) {
              bgColorClass = "bg-meta-11";
            }

            return (
              <div
                key={info.stage}
                className="flex cursor-pointer flex-col items-center"
                onClick={() =>
                  setSelectedStage(
                    selectedStage === info.stage ? null : info.stage,
                  )
                }
              >
                {/* Compact display for mobile */}
                <div
                  className={`h-10 w-10 rounded-full ${bgColorClass} ${textColorClass} flex items-center justify-center text-xs font-medium shadow-md ${
                    selectedStage === info.stage
                      ? `dark:ring-offset-boxdark ring-2 ring-offset-1 ${
                          info.stage === "Job Done"
                            ? "ring-success"
                            : [
                                  "Deposit",
                                  "Production",
                                  "Installation",
                                ].includes(info.stage)
                              ? "ring-meta-11"
                              : "ring-primary"
                        }`
                      : ""
                  } transition-all duration-200`}
                >
                  {index + 1}
                </div>
                <div className="mt-1 max-w-[60px] text-wrap text-center text-[10px] text-black dark:text-white">
                  {info.stage}
                </div>
                <div className="text-[10px] font-bold">{info.count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PIC filter buttons with counts and search input */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center justify-between">
          {/* Sales rep filters with dark mode support */}
          <div className="mb-2 flex flex-wrap gap-2 md:mb-0">
            <button
              className={`rounded-full px-3 py-1 text-xs ${
                !selectedPIC
                  ? "bg-indigo-600 text-white dark:bg-indigo-700"
                  : "dark:bg-meta-4 bg-gray-100 text-gray-700 dark:text-gray-300"
              }`}
              onClick={() => setSelectedPIC(null)}
            >
              All Sales Reps ({tasksWithProgress.length})
            </button>
            {uniquePICs.map((pic) => {
              // Calculate how many tasks are assigned to this PIC
              const picTaskCount = tasksWithProgress.filter((task) => {
                const picName = task.pic
                  ? task.pic.split("/")[0].trim()
                  : "Unassigned";
                return picName === pic;
              }).length;

              return (
                <button
                  key={pic}
                  className={`rounded-full px-3 py-1 text-xs ${
                    selectedPIC === pic
                      ? "bg-indigo-600 text-white dark:bg-indigo-700"
                      : "dark:bg-meta-4 bg-gray-100 text-gray-700 dark:text-gray-300"
                  } flex items-center`}
                  onClick={() =>
                    setSelectedPIC(selectedPIC === pic ? null : pic)
                  }
                >
                  <span>{pic}</span>
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${
                      selectedPIC === pic
                        ? "bg-indigo-400/30 text-white dark:bg-indigo-300/30"
                        : "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {picTaskCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search input - right side */}
          <div className="relative w-full md:w-auto md:min-w-[200px]">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-stroke focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-4 py-2 text-sm transition outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
            {!searchQuery && (
              <span className="absolute top-1/2 right-2 -translate-y-1/2 transform text-gray-400">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Individual task progress */}
      <h4 className="text-md mb-3 font-medium text-black dark:text-white">
        {selectedStage && selectedPIC
          ? `Tasks for ${selectedPIC} in ${selectedStage} Stage`
          : selectedStage
            ? `Tasks in ${selectedStage} Stage`
            : selectedPIC
              ? `Tasks for ${selectedPIC}`
              : "Recent Tasks Progress"}
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
          ({displayedTasks.length} tasks)
        </span>
      </h4>

      {/* Changed from space-y-3 to grid with 2 columns */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-2">
        {displayedTasks.map((task) => {
          // Determine color based on progress
          let colorClass = "bg-primary";
          if (task.progressPercentage >= 100) colorClass = "bg-success";
          else if (task.progressPercentage >= 60) colorClass = "bg-meta-11";

          // Parse composite fields into components
          const [name, nric] = (task.name || "")
            .split("/")
            .map((s: string) => s.trim());
          const [phone1, phone2, email] = (task.contact || "")
            .split("/")
            .map((s: string) => s.trim());
          const [sourceName, interested, addInfo] = (task.source || "")
            .split("/")
            .map((s: string) => s.trim());
          const [salesName, salesUid] = (task.pic || "")
            .split("/")
            .map((s: string) => s.trim());

          return (
            <div
              key={task.id}
              className="dark:bg-form-input border-stroke dark:border-strokedark rounded-md border bg-white p-3"
            >
              {/* Enhanced header with name, NRIC, and contact details inline */}
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div className="flex-1">
                  {/* Name and NRIC line with contact details */}
                  <div className="flex flex-wrap items-center gap-2">
                    <h5 className="font-medium text-black dark:text-white">
                      {name}
                    </h5>
                    {nric && (
                      <span className="dark:bg-meta-4 border-stroke dark:border-strokedark rounded-sm border bg-gray-50 px-1.5 py-0.5 text-xs">
                        {nric}
                      </span>
                    )}

                    {/* Contact details inline */}
                    {phone1 && (
                      <span className="flex items-center text-sm">
                        <svg
                          className="mr-1 h-3.5 w-3.5 text-green-500"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="m15.271 13.21c.578.185 1.078.416 1.543.7l-.031-.018c.529.235.986.51 1.403.833l-.015-.011c.02.061.032.13.032.203 0 .011 0 .021-.001.032v-.001c-.015.429-.11.832-.271 1.199l.008-.021c-.231.463-.616.82-1.087 1.01l-.014.005c-.459.243-1.001.393-1.576.411h-.006c-1.1-.146-2.094-.484-2.988-.982l.043.022c-1.022-.468-1.895-1.083-2.636-1.829l-.001-.001c-.824-.857-1.579-1.795-2.248-2.794l-.047-.074c-.636-.829-1.041-1.866-1.1-2.995l-.001-.013v-.124c.032-.975.468-1.843 1.144-2.447l.003-.003c.207-.206.491-.335.805-.341h.001c.101.003.198.011.292.025l-.013-.002c.087.013.188.021.292.023h.003c.019-.002.04-.003.062-.003.13 0 .251.039.352.105l-.002-.001c.107.118.189.261.238.418l.002.008q.124.31.512 1.364c.135.314.267.701.373 1.099l.014.063c-.076.361-.268.668-.533.889l-.003.002q-.535.566-.535.72c.004.088.034.168.081.234l-.001-.001c.405.829.936 1.533 1.576 2.119l.005.005c.675.609 1.446 1.132 2.282 1.54l.059.026c.097.063.213.103.339.109h.002q.233 0 .838-.752t.804-.752zm-3.147 8.216h.022c1.357 0 2.647-.285 3.814-.799l-.061.024c2.356-.994 4.193-2.831 5.163-5.124l.024-.063c.49-1.113.775-2.411.775-3.775s-.285-2.662-.799-3.837l.024.062c-.994-2.356-2.831-4.193-5.124-5.163l-.063-.024c-1.113-.49-2.411-.775-3.775-.775s-2.662.285-3.837.799l.062-.024c-2.356.994-4.193 2.831-5.163 5.124l-.024.063c-.49 1.117-.775 2.419-.775 3.787 0 2.141.698 4.12 1.879 5.72l-.019-.026-1.225 3.613 3.752-1.194c1.49 1.01 3.327 1.612 5.305 1.612h.047zm0-21.426h.033c1.628 0 3.176.342 4.575.959l-.073-.029c2.825 1.197 5.028 3.4 6.196 6.149l.029.076c.588 1.337.93 2.896.93 4.535s-.342 3.198-.959 4.609l.029-.074c-1.197 2.825-3.4 5.028-6.149 6.196l-.076.029c-1.327.588-2.875.93-4.503.93-.011 0-.023 0-.034 0h.002c-.016 0-.034 0-.053 0-2.059 0-3.992-.541-5.664-1.488l.057.03-6.465 2.078 2.109-6.279c-1.051-1.714-1.674-3.789-1.674-6.01 0-1.646.342-3.212.959-4.631l-.029.075c1.197-2.825 3.4-5.028 6.149-6.196l.076-.029c1.327-.588 2.875-.93 4.503-.93h.033-.002z" />
                        </svg>
                        {phone1}
                      </span>
                    )}
                    {phone2 && (
                      <span className="flex items-center text-sm">
                        <svg
                          className="mr-1 h-3.5 w-3.5 text-gray-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                        {phone2}
                      </span>
                    )}

                    {email && (
                      <span className="flex items-center text-sm">
                        <svg
                          className="mr-1 h-3.5 w-3.5 text-gray-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                        <span className="max-w-[150px] truncate">{email}</span>
                      </span>
                    )}
                  </div>

                  {/* Full address on its own row */}
                  {task.address && (
                    <div className="mt-1.5 flex items-start text-sm">
                      {/* <svg
                        className="mt-0.5 mr-1.5 h-3.5 w-3.5 shrink-0 text-red-500"
                        fill="currentColor"
                        width="800px"
                        height="800px"
                        viewBox="0 0 256 256"
                      >
                        <path d="M127.99414,15.9971a88.1046,88.1046,0,0,0-88,88c0,75.29688,80,132.17188,83.40625,134.55469a8.023,8.023,0,0,0,9.1875,0c3.40625-2.38281,83.40625-59.25781,83.40625-134.55469A88.10459,88.10459,0,0,0,127.99414,15.9971ZM128,72a32,32,0,1,1-32,32A31.99909,31.99909,0,0,1,128,72Z" />
                      </svg> */}
                      <svg
                        className="mt-0.5 mr-1.5 h-3.5 w-3.5 text-red-500"
                        fill="currentColor"
                        width="800px"
                        height="800px"
                        viewBox="0 0 320 512"
                      >
                        <path d="M16 144a144 144 0 1 1 288 0A144 144 0 1 1 16 144zM160 80c8.8 0 16-7.2 16-16s-7.2-16-16-16c-53 0-96 43-96 96c0 8.8 7.2 16 16 16s16-7.2 16-16c0-35.3 28.7-64 64-64zM128 480l0-162.9c10.4 1.9 21.1 2.9 32 2.9s21.6-1 32-2.9L192 480c0 17.7-14.3 32-32 32s-32-14.3-32-32z" />
                      </svg>
                      <span className="break-words text-gray-600 dark:text-gray-300">
                        {task.address}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center">
                  <button
                    className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap ${
                      task.status === "Job Done"
                        ? "bg-success/20 text-success hover:bg-success/30 dark:bg-success/30 dark:hover:bg-success/40"
                        : ["Deposit", "Production", "Installation"].includes(
                              task.status,
                            )
                          ? "bg-meta-11/20 text-warning hover:bg-meta-11/30 dark:bg-meta-11/30 dark:hover:bg-meta-11/40"
                          : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-700/30 dark:text-indigo-300 dark:hover:bg-indigo-700/40"
                    } transition-colors`}
                    onClick={() =>
                      (window.location.href = `/sales/task/edit?id=${task.id}`)
                    }
                    title="Update task status"
                  >
                    <svg
                      className="h-3 w-3"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Update
                  </button>
                </div>
              </div>

              {/* Source Info - horizontal and inline layout */}
              {/* <div className="dark:bg-meta-4 rounded-sm bg-gray-50 px-3 py-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-sm font-medium">Source Info: </span>
                  {sourceName && (
                    <span className="text-gray-700 dark:text-gray-300">
                      {sourceName} /
                    </span>
                  )}
                  {interested && (
                    <span className="text-gray-700 dark:text-gray-300">
                      {interested} /
                    </span>
                  )}
                  {addInfo && (
                    <span className="text-gray-700 dark:text-gray-300">
                      {addInfo}
                    </span>
                  )}
                </div>
              </div> */}

              {/* Progress section */}
              <div className="my-2 flex items-center justify-between">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm font-medium">
                  {task.progressPercentage}%
                </span>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-300">
                <div
                  className={`h-full ${colorClass} rounded-full transition-all duration-300`}
                  style={{ width: `${task.progressPercentage}%` }}
                />
              </div>

              {/* Pipeline position indicator */}
              <div className="mt-2 mb-3 flex items-center justify-between">
                {pipelineStages.map((stage, index) => (
                  <div
                    key={stage}
                    className={`h-1.5 w-1.5 rounded-full ${index <= task.stageIndex ? colorClass : "bg-gray-200 dark:bg-gray-300"}`}
                    title={stage}
                  />
                ))}
              </div>

              {/* Person-In-Charge moved to bottom */}
              <div className="border-stroke dark:border-strokedark mt-3 border-t pt-3 text-xs">
                <div className="flex items-center justify-between">
                  {/* ID, date and UID line */}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-black dark:text-white">
                    <span>ID: {task.id}</span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="mr-1 h-3 w-3 text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.660.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <span className="font-semibold text-black dark:text-white">
                      PIC:
                    </span>
                    <span className="ml-1 text-black dark:text-white">
                      {salesName || "Unassigned"}
                    </span>
                    {salesUid && (
                      <span className="text-black dark:text-white">
                        , {salesUid}
                      </span>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap ${
                      task.status === "Job Done"
                        ? "bg-success/10 text-success"
                        : ["Deposit", "Production", "Installation"].includes(
                              task.status,
                            )
                          ? "bg-meta-11/10 text-meta-11"
                          : "bg-primary/10 text-primary"
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {displayedTasks.length === 0 && (
          <div className="col-span-2 py-8 text-center text-gray-500">
            No tasks found in this stage.
          </div>
        )}
      </div>

      {/* Show more link */}
      {!selectedStage && tasksWithProgress.length > 12 && (
        <div className="mt-4 text-center">
          <Link href="/sales/task" className="text-primary hover:underline">
            View all {tasksWithProgress.length} tasks
          </Link>
        </div>
      )}
    </div>
  );
}
