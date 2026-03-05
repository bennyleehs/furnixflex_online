import React, { useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

interface ProgressTableProps {
  data: any[];
  statusCounts: Record<string, number>;
  totalItems: number;
  pageName: string;
  selectedStatus?: string;
  onFilterChange?: (key: string, value: string) => void;
  onSearchChange?: (query: string) => void;
}
  const section1 = ["Assign PIC", "Follow Up", "Visit Showroom"];
  const section2 = ["Quotation", "Payment", "Production", "Installation"];
  const section3 = ["Over Budget", "Others Design", "Drop Interest", "Others"];
  // Helper function to check if a status belongs to the Others group
  const isOthersGroup = (status: string) => section3.includes(status);

export default function ProgressTable({
  data,
  statusCounts,
  totalItems,
  pageName,
  selectedStatus,
  onFilterChange,
  onSearchChange,
}: ProgressTableProps) {
  // Memoize the pipeline stages array
  const pipelineStages = useMemo(
    () => [...section1, ...section2, "Others", "Job Done"],
    [],
  ); 

  // const [selectedStage, setSelectedStage] = useState<string | null>(null); // State for task filtering
  const [selectedPIC, setSelectedPIC] = useState<string | null>(null); // Add a new state for PIC filtering
  const [searchQuery, setSearchQuery] = useState<string>(""); // Add this after the existing useState declarations

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

  // Calculate stage percentages and prepare data // Initialize with zeros
  const stageData = useMemo(() => {
    const counts = pipelineStages.reduce(
      (acc, stage) => {
        acc[stage] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Track individual counts for Others group
    const othersIndividualCounts = {} as Record<string, number>;

    // Count tasks in each stage
    data.forEach((task) => {
      const status = task.status;
      if (isOthersGroup(status)) {
        // Count under "Others" stage
        counts["Others"] = (counts["Others"] || 0) + 1;
        // Track individual status for tooltips
        othersIndividualCounts[status] =
          (othersIndividualCounts[status] || 0) + 1;
      } else if (pipelineStages.includes(status)) {
        counts[status]++;
      }
    });

    let totalTasks = 0; // Calculate relative position in pipeline for each task
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
        // Add individual counts for Others stage
        individualCounts: stage === "Others" ? othersIndividualCounts : null,
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
    return data.map((task) => {
      let stageIndex;
      let displayStage;

      if (isOthersGroup(task.status)) {
        // If status is in section3, it belongs to "Others" stage
        stageIndex = pipelineStages.indexOf("Others");
        displayStage = "Others";
      } else {
        stageIndex = pipelineStages.indexOf(task.status);
        displayStage = task.status;
      }

      const progressPercentage =
        stageIndex >= 0
          ? Math.round(((stageIndex + 1) / pipelineStages.length) * 100)
          : 0;

      return {
        ...task,
        progressPercentage,
        stageIndex,
        displayStage,
        isOthersGroup: isOthersGroup(task.status),
      };
    });
  }, [data, pipelineStages]);

  // Update the displayedTasks memo to include search functionality
  const displayedTasks = useMemo(() => {
    let filtered = tasksWithProgress;

    // Apply PIC filter if selected
    if (selectedPIC) {
      filtered = filtered.filter((task) => {
        const picName = task.pic ? task.pic.split("/")[0].trim() : "Unassigned";
        return picName === selectedPIC;
      });
    }

    // Handle status filtering with Others group
    if (selectedStatus && selectedStatus !== "All") {
      if (selectedStatus === "Others") {
        // If "Others" is selected, show all tasks from section3
        filtered = filtered.filter((task) => isOthersGroup(task.status));
      } else {
        // Otherwise filter by exact status
        filtered = filtered.filter((task) => task.status === selectedStatus);
      }
    }

    // Apply search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((task) => {
        return (
          (task.name && task.name.toLowerCase().includes(query)) ||
          (task.contact && task.contact.toLowerCase().includes(query)) ||
          (task.address && task.address.toLowerCase().includes(query)) ||
          (task.source && task.source.toLowerCase().includes(query)) ||
          (task.followUp_status &&
            task.followUp_status.toLowerCase().includes(query)) ||
          (task.pic && task.pic.toLowerCase().includes(query)) ||
          (task.id && task.id.toString().includes(query))
        );
      });
    }
    // Limit results if no filters are applied
    // if (!selectedStage && !selectedPIC && !searchQuery) {filtered = filtered.slice(0, 12); }
    console.log(
      "📦 displayedTasks IDs",
      filtered.map((task) => task.id),
    );

    return filtered;
  }, [tasksWithProgress, selectedStatus, selectedPIC, searchQuery]);

  const uniqueDisplayedTasks = useMemo(() => {
    const seen = new Set();
    return displayedTasks.filter((task) => {
      if (seen.has(task.id)) return false;
      seen.add(task.id);
      return true;
    });
  }, [displayedTasks]);

  return (
    <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark mb-5 rounded-lg border bg-white p-5">
      {/* Header with Pipeline Flow title and breadcrumb on right */}
      <div className="mb-4 flex flex-wrap items-center justify-between">
        <h4 className="text-md font-medium">Pipeline Flow</h4>
        <div className="text-sm">
          <Breadcrumb pageName={pageName} noHeader={true} />
        </div>
      </div>

      {/* Pipeline flow visualization with responsive layout */}
      {/* Desktop view - full pipeline */}
      <div className="border-stroke dark:border-stroke/40 relative mb-1 hidden border-b py-4 md:flex">
        {stageData.stageInfo.map((info, index) => {
          // Determine color based on stage
          let bgColorClass = "bg-meta-8";
          let textColorClass = "text-white";

          if (info.stage === "Job Done")
            bgColorClass = "bg-success dark:bg-green-500";
          else if (section2.includes(info.stage)) {
            bgColorClass = "bg-meta-10";
          } else if (["Others"].includes(info.stage)) {
            bgColorClass = "bg-meta-11";
          }

          return (
            <div
              key={info.stage}
              className="flex min-w-0 flex-1 cursor-pointer flex-col items-center px-1 text-center"
              // onClick={() => setSelectedStage(selectedStage === info.stage ? null : info.stage,  )}
              onClick={() => {
                // setSelectedStage(
                //   selectedStage === info.stage ? null : info.stage,
                // );
                // onFilterChange?.("status", info.stage);
                onFilterChange?.(
                  "status",
                  selectedStatus === info.stage ? "All" : info.stage,
                );
              }}
            >
              {/* Circular count indicator with dark-mode compatible border highlight */}
              <div className="relative">
                <div
                  className={`h-10 w-10 rounded-full ${bgColorClass} ${textColorClass} flex items-center justify-center text-lg font-medium shadow-md ${
                    // selectedStage === info.stage
                    selectedStatus === info.stage
                      ? `dark:ring-offset-boxdark scale-110 transform ring-4 ring-offset-2 ring-offset-white ${
                          info.stage === "Job Done"
                            ? "ring-success dark:ring-green-500"
                            : [
                                  "Quotation",
                                  "Payment",
                                  "Production",
                                  "Installation",
                                ].includes(info.stage)
                              ? "ring-meta-10"
                              : ["Others"].includes(info.stage)
                                ? "ring-meta-11"
                                : "ring-meta-8"
                        }`
                      : ""
                  } transition-all duration-200`}
                >
                  {info.count}
                </div>
              </div>

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
      <div className="border-stroke dark:border-strokedark mb-1 flex gap-8 overflow-x-auto border-b px-2 py-4 md:hidden">
        {stageData.stageInfo.map((info, index) => {
          let bgColorClass = "bg-meta-8"; // Determine color based on stage
          let textColorClass = "text-white";

          if (info.stage === "Job Done")
            bgColorClass = "bg-success dark:bg-green-500";
          else if (
            ["Quotation", "Payment", "Production", "Installation"].includes(
              info.stage,
            )
          ) {
            bgColorClass = "bg-meta-10";
          } else if (["Others"].includes(info.stage)) {
            bgColorClass = "bg-meta-11";
          }

          return (
            <div
              key={info.stage}
              className="flex cursor-pointer flex-col items-center"
              onClick={() =>
                // setSelectedStage(
                //   selectedStage === info.stage ? null : info.stage,
                // )
                onFilterChange?.(
                  "status",
                  selectedStatus === info.stage ? "All" : info.stage,
                )
              }
            >
              {/* Compact display for mobile */}
              <div
                className={`h-10 w-10 rounded-full ${bgColorClass} ${textColorClass} text-md flex items-center justify-center font-medium shadow-md ${
                  // selectedStage === info.stage
                  selectedStatus === info.stage
                    ? `dark:ring-offset-boxdark ring-2 ring-offset-1 ${
                        info.stage === "Job Done"
                          ? "ring-success dark:ring-green-500"
                          : [
                                "Quotation",
                                "Payment",
                                "Production",
                                "Installation",
                              ].includes(info.stage)
                            ? "ring-meta-10"
                            : ["Others"].includes(info.stage)
                              ? "ring-meta-11"
                              : "ring-meta-8"
                      }`
                    : ""
                } transition-all duration-200`}
              >
                {info.count}
              </div>
              <div className="mt-2 flex w-full flex-col items-center text-xs text-black dark:text-white">
                <span className="font-bold">{index + 1}</span>
              </div>
              <div className="mt-1 max-w-15 text-center text-xs text-wrap text-black dark:text-white">
                {info.stage}
              </div>
            </div>
          );
        })}
      </div>

      {/* PIC filter buttons with counts and search input */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center justify-between">
          {/* Sales rep filters with dark mode support */}
          <div className="flex gap-2 overflow-x-auto py-2 whitespace-nowrap">
            <button
              className={`rounded-full px-2 py-1 text-xs ${
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
                  className={`rounded-full px-2 py-1 text-xs ${
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
                        : "bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {picTaskCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search input - right side */}
          <div className="relative w-full py-2 md:w-auto md:min-w-[200px]">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              // onChange={(e) => setSearchQuery(e.target.value)}
              onChange={(e) => {
                console.log("Input changed to:", e.target.value);
                setSearchQuery(e.target.value);
                onSearchChange?.(e.target.value); // trigger parent state reset
              }}
              className="border-stroke dark:border-strokedark focus:border-primary dark:bg-meta-4 w-full rounded border px-3 py-1 text-sm focus:outline-hidden dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  console.log("Clear button clicked");
                  setSearchQuery("");
                  onSearchChange?.("");
                }}
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
      {/* <h4 className="text-md mb-3 font-medium text-black dark:text-white">
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
      </h4> */}
      <h4 className="text-md mb-3 font-medium text-black dark:text-white">
        {selectedStatus && selectedPIC
          ? `Tasks for ${selectedPIC} in ${selectedStatus === "Others" ? "Others (All non-standard statuses)" : selectedStatus} Stage`
          : selectedStatus
            ? `Tasks in ${selectedStatus === "Others" ? "Others (All non-standard statuses)" : selectedStatus} Stage`
            : selectedPIC
              ? `Tasks for ${selectedPIC}`
              : "Recent Tasks Progress"}
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
          ({uniqueDisplayedTasks.length} tasks)
        </span>
      </h4>

      <div className="grid grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-2 xl:grid-cols-5">
        {/* {displayedTasks.map((task) => { */}
        {Array.from(
          new Map(uniqueDisplayedTasks.map((t) => [t.id, t])).values(),
        ).map((task) => {
          // Determine color based on progress
          let colorClass = "bg-meta-8";
          if (section3.includes(task.status)) {
            colorClass = "bg-meta-11";
          } else if (task.progressPercentage >= 100) {
            colorClass = "bg-success dark:bg-green-500";
          } else if (task.progressPercentage >= 40) {
            colorClass = "bg-meta-10";
          }

          // Parse composite fields into components
          const [name, nric] = (task.name || "")
            .split("/")
            .map((s: string) => s.trim());

          const createdDateObj = new Date(task.created_at);
          const created_date = createdDateObj.toLocaleDateString("en-GB", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });

          const [phone1, phone2, email] = (task.contact || "")
            .split("/")
            .map((s: string) => s.trim());
          const [salesName, salesUid] = (task.pic || "")
            .split("/")
            .map((s: string) => s.trim());

          return (
            <div
              key={task.id}
              className="dark:bg-form-input border-strokedark/30 hover:border-strokedark/80 dark:border-stroke/40 hover:dark:border-stroke flex h-full flex-col rounded-lg border bg-white p-3 shadow-xl dark:shadow-lg dark:shadow-gray-400/20"
            >
              <div className="border-stroke dark:border-stroke/20 mb-4 flex justify-between border-b pb-4">
                <div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap ${
                      task.status === "Job Done"
                        ? "bg-success/10 text-success border-success border"
                        : section2.includes(task.status)
                          ? "bg-meta-10/10 text-meta-10 border-meta-10 border"
                          : section3.includes(task.status)
                            ? "bg-meta-11/10 text-meta-11 border-meta-11 border"
                            : "bg-meta-8/10 text-meta-8 border-meta-8 border"
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
                {/* Display date */}
                <div className="pt-1 text-sm text-black dark:text-white">
                  {/* <span className="font-semibold">DATE: </span> */}
                  <span className="ml-1 font-semibold">{created_date}</span>
                </div>
              </div>

              {/* Customer info section with better containment */}
              <div className="dark:bg-meta-4/30 border-stroke dark:border-stroke/40 mb-2 rounded-md border bg-gray-100 p-2">
                {/* Customer header with name and action button */}
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <h5 className="font-medium text-black dark:text-white">
                      {name}
                    </h5>
                  </div>
                </div>

                {/* Contact information section */}
                <div className="space-y-1.5">
                  {/* Primary phone */}
                  {phone1 && (
                    <a
                      href={`https://wa.me/${phone1.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-success hover:text-success/80 inline-flex items-center gap-1 transition-colors"
                    >
                      <span className="flex items-center text-sm">
                        <svg
                          className="mr-1 h-3.5 w-3.5 shrink-0 text-green-500"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="m15.271 13.21c.578.185 1.078.416 1.543.7l-.031-.018c.529.235.986.51 1.403.833l-.015-.011c.02.061.032.13.032.203 0 .011 0 .021-.001.032v-.001c-.015.429-.11.832-.271 1.199l.008-.021c-.231.463-.616.82-1.087 1.01l-.014.005c-.459.243-1.001.393-1.576.411h-.006c-1.1-.146-2.094-.484-2.988-.982l.043.022c-1.022-.468-1.895-1.083-2.636-1.829l-.001-.001c-.824-.857-1.579-1.795-2.248-2.794l-.047-.074c-.636-.829-1.041-1.866-1.1-2.995l-.001-.013v-.124c.032-.975.468-1.843 1.144-2.447l.003-.003c.207-.206.491-.335.805-.341h.001c.101.003.198.011.292.025l-.013-.002c.087.013.188.021.292.023h.003c.019-.002.04-.003.062-.003.13 0 .251.039.352.105l-.002-.001c.107.118.189.261.238.418l.002.008q.124.31.512 1.364c.135.314.267.701.373 1.099l.014.063c-.076.361-.268.668-.533.889l-.003.002q-.535.566-.535.72c.004.088.034.168.081.234l-.001-.001c.405.829.936 1.533 1.576 2.119l.005.005c.675.609 1.446 1.132 2.282 1.54l.059.026c.097.063.213.103.339.109h.002q.233 0 .838-.752t.804-.752zm-3.147 8.216h.022c1.357 0 2.647-.285 3.814-.799l-.061.024c2.356-.994 4.193-2.831 5.163-5.124l.024-.063c.49-1.113.775-2.411.775-3.775s-.285-2.662-.799-3.837l.024.062c-.994-2.356-2.831-4.193-5.124-5.163l-.063-.024c-1.113-.49-2.411-.775-3.775-.775s-2.662.285-3.837.799l.062-.024c-2.356.994-4.193 2.831-5.163 5.124l-.024.063c-.49 1.117-.775 2.419-.775 3.787 0 2.141.698 4.12 1.879 5.72l-.019-.026-1.225 3.613 3.752-1.194c1.49 1.01 3.327 1.612 5.305 1.612h.047zm0-21.426h.033c1.628 0 3.176.342 4.575.959l-.073-.029c2.825 1.197 5.028 3.4 6.196 6.149l.029.076c.588 1.337.93 2.896.93 4.535s-.342 3.198-.959 4.609l.029-.074c-1.197 2.825-3.4 5.028-6.149 6.196l-.076.029c-1.327.588-2.875.93-4.503.93-.011 0-.023 0-.034 0h.002c-.016 0-.034 0-.053 0-2.059 0-3.992-.541-5.664-1.488l.057.03-6.465 2.078 2.109-6.279c-1.051-1.714-1.674-3.789-1.674-6.01 0-1.646.342-3.212.959-4.631l-.029.075c1.197-2.825 3.4-5.028 6.149-6.196l.076-.029c1.327-.588 2.875-.93 4.503-.93h.033-.002z" />
                        </svg>
                        {phone1}
                      </span>
                    </a>
                  )}

                  {/* NRIC */}
                  {nric && nric !== "null" && (
                    <div className="flex items-center text-sm">
                      <span className="dark:bg-meta-4 border-stroke dark:border-strokedark rounded-sm border bg-white px-1.5 py-0.5 text-xs">
                        {nric}
                      </span>
                    </div>
                  )}

                  {/* Address */}
                  {task.address_short && (
                    <div className="flex items-start text-sm">
                      <svg
                        className="mt-0.5 mr-1.5 h-3.5 w-3.5 shrink-0 text-red-500"
                        fill="currentColor"
                        viewBox="0 0 320 512"
                      >
                        <path d="M16 144a144 144 0 1 1 288 0A144 144 0 1 1 16 144zM160 80c8.8 0 16-7.2 16-16s-7.2-16-16-16c-53 0-96 43-96 96c0 8.8 7.2 16 16 16s16-7.2 16-16c0-35.3 28.7-64 64-64zM128 480l0-162.9c10.4 1.9 21.1 2.9 32 2.9s21.6-1 32-2.9L192 480c0 17.7-14.3 32-32 32s-32-14.3-32-32z" />
                      </svg>
                      <span className="line-clamp-2 wrap-break-word text-gray-700 dark:text-gray-300">
                        {task.address_short}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom section with progress bar and PIC info */}
              <div className="mt-auto">
                {task.followUp_status && task.followUp_status !== "null" && (
                  <div className="py-2 text-sm text-black dark:text-white">
                    <span className="font-semibold">Note: </span>
                    <span className="dark:bg-meta-4 border-b-2 border-orange-300 bg-gray-100 px-2 py-1.5 dark:border-b-2 dark:border-orange-400">
                      {task.followUp_status}
                    </span>
                  </div>
                )}
                {/* Progress section */}
                <div className="my-2 flex items-center justify-between">
                  <div className="text-sm font-medium">
                    <span>Progress for </span>[
                    <span className="text-primary"> {task.id} </span>]
                  </div>
                </div>

                {section3.includes(task.status) ? (
                  <div className="text-center text-sm font-bold">
                    <span>No progress applicable.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-8">
                    <div className="col-span-6 col-end-7 content-center">
                      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-400">
                        <div
                          className={`h-full ${colorClass} rounded-full transition-all duration-300`}
                          style={{ width: `${task.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="col-end-9">
                      <div className="flex justify-end">
                        <span className="text-sm font-medium">
                          {task.progressPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Person-In-Charge section with status */}
                <div className="border-stroke dark:border-stroke/20 mt-3 border-t pt-3 text-xs">
                  {/* PIC info */}
                  <div className="flex justify-between">
                    <div>
                      <div className="text-sm text-black dark:text-white">
                        <span className="font-semibold">PIC:</span>
                        <span className="ml-1">
                          {salesName || "Unassigned"}
                        </span>
                        {salesUid && <span className="ml-1">({salesUid})</span>}
                      </div>
                      {/* Display date */}
                      {/* <div className="text-sm text-black dark:text-white">
                        <span className="font-semibold">DATE: </span>
                        <span className="ml-1">{created_date}</span>
                      </div> */}
                    </div>
                  </div>
                  {/* </div> */}

                  <div className="flex justify-end">
                    {task.status !== "Job Done" && (
                      <button
                        className="bg-primary hover:bg-primarydark dark:bg-primary dark:hover:bg-primarydark flex cursor-pointer items-center rounded-md px-4 py-1.5 text-sm font-medium whitespace-nowrap text-white transition-colors"
                        onClick={() =>
                          (window.location.href = `/sales/task/edit?id=${task.id}`)
                        }
                        title="Update task status"
                      >
                        {/* <svg
                          className="mr-2 h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg> */}
                        UPDATE
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {uniqueDisplayedTasks.length === 0 && (
          <div className="col-span-4 py-8 text-center text-gray-500">
            No tasks found in this stage.
          </div>
        )}
      </div>
    </div>
  );
}
