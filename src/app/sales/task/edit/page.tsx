"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import { EventLog } from "@/types/sales-task";

// Update the Task interface to match the API response structure
interface Task {
  id: number;
  name: string;
  phone1: string | null;
  phone2: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postcode: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  customer_remark: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  source: string | null;
  nric: string | null;
  sales_id: number | null;
  interested: string | null;
  add_info: string | null;
  sales_name: string | null;
  sales_uid: string | null;
  // Calculated fields we'll add
  stageIndex?: number;
  progressPercentage?: number;
}

export default function TaskEditPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const taskId = searchParams.get("id");

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [updateNote, setUpdateNote] = useState("");
  const hasFetchedData = useRef(false);

  // Add these new state variables
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [taskFiles, setTaskFiles] = useState<
    { name: string; size: number; date: string }[]
  >([]);

  // Add these state variables at the top of your component
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    name: string;
    type: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Add this state variable at the top of your component
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  // Add this state variable at the top of your component with the other state variables
  const [groupedTasks, setGroupedTasks] = useState<Record<string, Task>>({});

  // Pipeline stages from your existing app
  const pipelineStages = [
    "Follow Up",
    "Visit Showroom",
    "Quotation",
    "Deposit",
    "Production",
    "Installation",
    "Job Done",
  ];

  // Wrap fetchFtpLogs and fetchTaskFiles in useCallback
  const fetchFtpLogs = useCallback(async () => {
    try {
      if (!taskId) return;

      console.log("Fetching logs for task:", taskId);

      // Use the files endpoint with logs parameter
      const response = await fetch(`/api/sales/task/update?id=${taskId}`);
      if (!response.ok) throw new Error("Failed to fetch logs");

      const data = await response.json();
      console.log("Logs data received:", data);

      if (data.logs) {
        setEventLogs(data.logs);
        console.log("Event logs updated:", data.logs.length);
      }
    } catch (error) {
      console.error("Error fetching task logs:", error);
    }
  }, [taskId]);

  const fetchTaskFiles = useCallback(async () => {
    try {
      if (!taskId) return;

      // Use the dedicated files API endpoint
      const response = await fetch(`/api/sales/task/files?id=${taskId}`);
      if (!response.ok) throw new Error("Failed to fetch files");

      const data = await response.json();
      console.log("API response:", data);

      if (data.files) {
        setTaskFiles(data.files);
        console.log("Files fetched:", data.files.length, data.files);
      } else {
        console.log("No files property in response");
        setTaskFiles([]);
      }
    } catch (error) {
      console.error("Error fetching task files:", error);
      setTaskFiles([]);
    }
  }, [taskId]);

  // Call when the component loads
  useEffect(() => {
    async function fetchTask() {
      try {
        if (!taskId) {
          throw new Error("No task ID provided");
        }

        // Fetch task data
        const response = await fetch(`/api/sales/task?id=${taskId}`);
        if (!response.ok) throw new Error("Failed to fetch task");

        const responseData = await response.json();

        if (responseData.listTask) {
          setTask(responseData.listTask[0]);
        } else {
          throw new Error("No task data found");
        }

        await fetchFtpLogs();
        await fetchTaskFiles();
      } catch (error) {
        console.error("Error fetching task:", error);
      } finally {
        setLoading(false);
      }
    }

    if (!hasFetchedData.current && taskId) {
      fetchTask();
      hasFetchedData.current = true;
    }
  }, [taskId, fetchFtpLogs, fetchTaskFiles]);

  // Parse composite fields if needed
  const name = task?.name || "";
  const nric = task?.nric || "";
  const contact = task?.phone1 || null;

  // Handle status update
  const handleStatusUpdate = async (newStatus: string) => {
    try {
      if (!task || !taskId) return;

      // Optimistic UI update
      const oldStatus = task.status;

      // Update task in UI first
      setTask({
        ...task,
        status: newStatus,
        stageIndex: pipelineStages.indexOf(newStatus),
        progressPercentage: Math.round(
          ((pipelineStages.indexOf(newStatus) + 1) / pipelineStages.length) *
            100,
        ),
      });

      // Create FormData for file uploads
      const formData = new FormData();
      formData.append("id", taskId);
      formData.append("status", newStatus);
      formData.append("oldStatus", oldStatus);
      formData.append("notes", updateNote);
      formData.append("userName", "Current User"); // Replace with actual username

      // Add all files to FormData
      if (files.length > 0) {
        files.forEach((file) => {
          formData.append("files", file);
        });
      }

      // Add to event logs optimistically with file information
      const newLog: EventLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user: "Current User", // Replace with actual user
        action:
          files.length > 0 ? "Status Update with Attachments" : "Status Update",
        oldValue: oldStatus,
        newValue: newStatus,
        notes: updateNote,
      };

      setEventLogs([newLog, ...eventLogs]);
      setUpdateNote("");

      // API call to update backend
      const response = await fetch(`/api/sales/task/update`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to update task");

      // Clear files after successful upload
      setFiles([]);
      setPreviews([]);

      // Fetch updated logs from FTP
      fetchFtpLogs();

      // Add this line to refresh file list after update
      fetchTaskFiles();

      // If status is changed to Quotation, navigate to quotation page
      if (newStatus === "Quotation") {
        // Check if sales representative is assigned before redirecting
        if (!task.sales_uid || !task.sales_name) {
          // Show error or warning notification
          window.alert(
            "Sales Representative Required: Please assign a sales representative before creating a quotation.",
          );

          // Optionally revert the status change
          setTask({
            ...task,
            status: oldStatus,
            stageIndex: pipelineStages.indexOf(oldStatus),
            progressPercentage: Math.round(
              ((pipelineStages.indexOf(oldStatus) + 1) /
                pipelineStages.length) *
                100,
            ),
          });
        } else {
          // Add a small delay to allow users to see the status change before redirect
          setTimeout(() => {
            router.push(`/sales/quotation/auto?taskId=${taskId}`);
          }, 500);
        }
      }
    } catch (error) {
      console.error("Error updating task:", error);
      // Show error notification
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const selectedFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selectedFiles]);

    // Generate previews for images
    selectedFiles.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      } else {
        // For non-image files, just add a placeholder
        setPreviews((prev) => [...prev, "document"]);
      }
    });
  };

  // Remove a file
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  // Update useEffect to initialize selectedStatus from task
  useEffect(() => {
    if (task) {
      setSelectedStatus(task.status);
    }
  }, [task]);

  if (loading) {
    return (
      <DefaultLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="border-primary h-16 w-16 animate-spin rounded-full border-t-2 border-b-2"></div>
        </div>
      </DefaultLayout>
    );
  }

  if (!task) {
    return (
      <DefaultLayout>
        <div className="p-6 text-center">
          <h2 className="text-danger text-2xl font-bold">Task not found</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            The requested task could not be found.
          </p>
          <button
            className="bg-primary hover:bg-opacity-90 mt-4 rounded-md px-4 py-2 text-white"
            onClick={() => router.push("/sales/task")}
          >
            Back to Tasks
          </button>
        </div>
      </DefaultLayout>
    );
  }

  // Handle file preview for both uploaded and pending files
  const handleFilePreview = (file: any, isPending = false) => {
    let fileUrl;
    let fileType;

    if (isPending) {
      // For pending uploads (File objects)
      fileUrl = URL.createObjectURL(file);
      fileType = file.type;

      // Set the preview file data
      setPreviewFile({
        url: fileUrl,
        name: file.name,
        type: fileType,
      });
    } else {
      // For already uploaded files from taskFiles
      fileUrl = `/api/sales/task/download?id=${taskId}&file=${file.name}`;

      // Determine file type based on extension
      if (file.name.match(/\.(jpg|jpeg|png|gif)$/i)) {
        fileType = "image";
      } else if (file.name.match(/\.(pdf)$/i)) {
        fileType = "pdf";
      } else {
        fileType = "document";
      }

      // Set the preview file data
      setPreviewFile({
        url: fileUrl,
        name: file.name,
        type: fileType,
      });
    }

    // Show the preview modal
    setShowPreview(true);
  };

  // Define interface for grouped logs
  interface GroupedEventLog extends EventLog {
    hasFiles?: boolean;
    fileInfo?: string;
  }

  // In page.tsx, filter and group logs that have the same timestamp or are within 1 second of each other
  const groupedLogs = eventLogs.reduce<GroupedEventLog[]>((acc, log, index) => {
    const prevLog = index > 0 ? eventLogs[index - 1] : null;

    // If this log is within 1 second of the previous log, merge them
    if (
      prevLog &&
      Math.abs(
        new Date(log.timestamp).getTime() -
          new Date(prevLog.timestamp).getTime(),
      ) < 1000
    ) {
      // Modify the previous log to include this log's information
      const lastGroup = acc[acc.length - 1];
      lastGroup.notes = `${lastGroup.notes || ""}\n${log.notes || ""}`.trim();

      if (log.action.includes("File Upload")) {
        lastGroup.hasFiles = true;
        lastGroup.fileInfo = log.newValue;
      }

      return acc;
    }

    // Otherwise add this as a new group
    acc.push({
      ...log,
      hasFiles:
        log.action.includes("File Upload") ||
        log.action.includes("Attachments"),
    });
    return acc;
  }, []);

  const handleFileClick = (taskId: string, fileName: string) => {
    // Create the file URL for the API endpoint
    const fileUrl = `/api/sales/task/download?id=${taskId}&file=${fileName}`;

    // Determine file type based on extension
    let fileType: string;
    if (fileName.match(/\.(jpg|jpeg|png|gif)$/i)) {
      fileType = "image";
    } else if (fileName.match(/\.(pdf)$/i)) {
      fileType = "pdf";
    } else {
      fileType = "document";
    }

    // Set the preview file data
    setPreviewFile({
      url: fileUrl,
      name: fileName,
      type: fileType,
    });

    // Show the preview modal
    setShowPreview(true);
  };

  return (
    <DefaultLayout>
      <div className="mb-6 flex flex-col items-center justify-between md:flex-row">
        <Breadcrumb noHeader={true} pageName={`Update Task #${taskId}`} />

        {/* Files Badge */}
        {(taskFiles.length > 0 || files.length > 0) && (
          <div className="mt-3 md:mt-0">
            <div className="group relative">
              <button className="bg-success/10 hover:bg-success/20 text-success flex items-center space-x-2 rounded-full px-3 py-1.5 transition">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  ></path>
                </svg>
                <span className="text-sm font-medium">
                  {taskFiles.length + files.length} Files
                </span>
              </button>

              {/* Dropdown with file list - more compact design */}
              <div className="dark:bg-boxdark border-stroke dark:border-strokedark invisible absolute top-full right-0 z-50 mt-1 w-64 rounded-lg border bg-white opacity-0 shadow-lg transition-all duration-300 group-hover:visible group-hover:opacity-100">
                <div className="p-2">
                  <h6 className="mb-1 px-1 text-xs font-semibold text-black dark:text-white">
                    Attached Files
                  </h6>
                  <div className="max-h-64 overflow-y-auto">
                    {/* Uploaded files - with image thumbnails */}
                    {taskFiles.map((file) => (
                      <div
                        key={file.name}
                        className="dark:hover:bg-meta-4 flex items-center rounded-sm px-1 py-1 hover:bg-gray-50"
                      >
                        <div
                          className="flex w-full cursor-pointer items-center"
                          onClick={() => handleFilePreview(file)}
                        >
                          <div className="mr-1.5 shrink-0">
                            {file.name.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                              <div className="border-stroke dark:border-strokedark h-5 w-5 overflow-hidden rounded-sm border">
                                <img
                                  src={`/api/sales/task/download?id=${taskId}&file=${file.name}`}
                                  alt={file.name}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    // Fallback to icon if image fails to load
                                    e.currentTarget.style.display = "none";
                                    if (e.currentTarget.parentElement) {
                                      e.currentTarget.parentElement.innerHTML = `
                                        <svg class="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                      `;
                                    }
                                  }}
                                />
                              </div>
                            ) : file.name.match(/\.(pdf)$/i) ? (
                              <svg
                                className="h-3 w-3 text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                ></path>
                              </svg>
                            ) : (
                              <svg
                                className="text-primary h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                ></path>
                              </svg>
                            )}
                          </div>
                          <span className="max-w-[200px] truncate text-xs">
                            {file.name}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Pending upload files - with image previews */}
                    {files.map((file, index) => (
                      <div
                        key={`pending-${index}`}
                        className="dark:hover:bg-meta-4 flex items-center rounded-sm px-1 py-1 hover:bg-gray-50"
                      >
                        <div
                          className="flex w-full cursor-pointer items-center"
                          onClick={() => handleFilePreview(file, true)}
                        >
                          <div className="mr-1.5 shrink-0">
                            {file.type.startsWith("image/") ? (
                              <div className="border-stroke dark:border-strokedark h-5 w-5 overflow-hidden rounded-sm border">
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={file.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : file.type === "application/pdf" ? (
                              <svg
                                className="h-3 w-3 text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                ></path>
                              </svg>
                            ) : (
                              <svg
                                className="text-primary h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                ></path>
                              </svg>
                            )}
                          </div>
                          <div className="flex min-w-0 flex-1 items-center">
                            <span className="max-w-[150px] truncate text-xs">
                              {file.name}
                            </span>
                            <span className="bg-warning/20 text-warning ml-1 shrink-0 rounded-sm px-1 py-0 text-[9px]">
                              New
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* No files message */}
                    {taskFiles.length === 0 && files.length === 0 && (
                      <div className="py-2 text-center text-xs text-gray-500">
                        No files attached
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Left column - Task details with vertical flex layout */}
        <div className="md:col-span-2">
          <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-xs border bg-white p-6">
            {/* Customer header section */}
            <div className="border-stroke dark:border-strokedark border-b pb-5">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-semibold text-black dark:text-white">
                    {name}
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      task.status === "Job Done"
                        ? "bg-success/20 text-success dark:bg-success/10"
                        : task.status === "Installation"
                          ? "bg-indigo/20 text-indigo dark:bg-indigo/10"
                          : task.status === "Production"
                            ? "bg-warning/20 text-warning dark:bg-warning/10"
                            : task.status === "Deposit"
                              ? "bg-amber/20 dark:bg-amber/10 text-amber-600 dark:text-amber-400"
                              : task.status === "Quotation"
                                ? "bg-info/20 text-info dark:bg-info/10"
                                : task.status === "Visit Showroom"
                                  ? "bg-purple/20 dark:bg-purple/10 text-purple-600 dark:text-purple-400"
                                  : "bg-primary/20 text-primary dark:bg-primary/10"
                    }`}
                  >
                    {task.status}
                  </span>
                </div>

                {/* Contact information as flex-column on mobile, flex-row on larger screens */}
                <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
                  {nric && (
                    <span className="border-stroke dark:bg-meta-4 dark:border-strokedark inline-flex items-center rounded-sm border bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-700 dark:text-gray-300">
                      <svg
                        className="mr-1 h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                        ></path>
                      </svg>
                      {nric}
                    </span>
                  )}

                  {task.phone1 && (
                    <a
                      href={`https://wa.me/${task.phone1.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-success hover:text-success/80 inline-flex items-center gap-1 transition-colors"
                    >
                      <svg
                        className="h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 448 512"
                        fill="currentColor"
                      >
                        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                      </svg>
                      {task.phone1}
                    </a>
                  )}

                  {(task.address_line1 || task.state) && (
                    <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      {/* <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        ></path>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        ></path>
                      </svg> */}
                      <svg
                        className="h-4 w-4 text-red-500"
                        fill="currentColor"
                        width="800px"
                        height="800px"
                        viewBox="0 0 320 512"
                      >
                        <path d="M16 144a144 144 0 1 1 288 0A144 144 0 1 1 16 144zM160 80c8.8 0 16-7.2 16-16s-7.2-16-16-16c-53 0-96 43-96 96c0 8.8 7.2 16 16 16s16-7.2 16-16c0-35.3 28.7-64 64-64zM128 480l0-162.9c10.4 1.9 21.1 2.9 32 2.9s21.6-1 32-2.9L192 480c0 17.7-14.3 32-32 32s-32-14.3-32-32z" />
                      </svg>
                      {task.address_line1}
                      {task.address_line1 && task.state ? ", " : ""}
                      {task.state}
                    </span>
                  )}

                  {/* Interested field */}
                  {task.interested && (
                    <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                        ></path>
                      </svg>
                      {task.interested}
                    </span>
                  )}

                  {/* Additional info field */}
                  {task.add_info && (
                    <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                      {task.add_info}
                    </span>
                  )}

                  {/* Source field */}
                  {task.source && (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                      {task.source}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Task Update Form - Status, Notes, File Upload */}
            <div className="border-stroke dark:border-strokedark border-t pt-5">
              {/* <h5 className="mb-4 text-md font-medium text-black dark:text-white">Update Task</h5> */}

              {/* Status Dropdown */}
              <div className="mb-4.5 w-full">
                <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                  Status
                </label>
                <div className="relative z-20 bg-transparent">
                  <select
                    className="border-stroke focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary relative z-20 w-full appearance-none rounded-sm border bg-transparent px-5 py-3 outline-hidden transition"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    {pipelineStages.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                  <span className="absolute top-1/2 right-4 z-30 -translate-y-1/2">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g opacity="0.8">
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M5.29289 8.29289C5.68342 7.90237 6.31658 7.90237 6.70711 8.29289L12 13.5858L17.2929 8.29289C17.6834 7.90237 18.3166 7.90237 18.7071 8.29289C19.0976 8.68342 19.0976 9.31658 18.7071 9.70711L12.7071 15.7071C12.3166 16.0976 11.6834 16.0976 11.2929 15.7071L5.29289 9.70711C4.90237 9.31658 4.90237 8.68342 5.29289 8.29289Z"
                          fill="#637381"
                        ></path>
                      </g>
                    </svg>
                  </span>
                </div>
              </div>

              {/* Notes Textarea */}
              <div className="mb-4.5">
                <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                  Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Add notes about this update..."
                  className="border-stroke focus:border-primary active:border-primary disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-5 py-3 text-sm font-medium outline-hidden transition disabled:cursor-default"
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                ></textarea>
              </div>

              {/* File Upload */}
              <div className="mb-5.5">
                <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                  Attach Files
                </label>

                <div className="relative">
                  <input
                    type="file"
                    className="hidden"
                    id="fileUpload"
                    multiple
                    onChange={handleFileChange}
                  />
                  <label
                    htmlFor="fileUpload"
                    className="border-primary flex w-full cursor-pointer items-center justify-center rounded-md border border-dashed px-6 py-4"
                  >
                    <div className="flex flex-col items-center gap-1 text-center">
                      <span className="text-primary">
                        <svg
                          className="h-8 w-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                      </span>
                      <p className="text-body-color text-sm dark:text-gray-400">
                        <span className="text-primary font-medium">
                          Click to upload
                        </span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-body-color mt-1 text-xs dark:text-gray-400">
                        JPG, PNG, PDF (MAX 10MB)
                      </p>
                    </div>
                  </label>
                </div>

                {/* File Previews */}
                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Selected files:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {files.map((file, index) => (
                        <div
                          key={`file-preview-${index}`}
                          className="dark:bg-meta-4 group relative flex items-center gap-2 rounded-md bg-gray-50 p-2"
                        >
                          {file.type.startsWith("image/") ? (
                            <div className="border-stroke dark:border-strokedark h-10 w-10 shrink-0 overflow-hidden rounded-sm border">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="bg-primary/10 dark:bg-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-sm">
                              <svg
                                className="text-primary h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                ></path>
                              </svg>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            className="text-danger hover:text-danger-hover"
                            onClick={() => removeFile(index)}
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                              ></path>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Update Button */}
              <button
                type="button"
                onClick={() => handleStatusUpdate(selectedStatus)}
                className="bg-primary hover:bg-opacity-90 flex w-full justify-center rounded-sm p-3 font-medium text-white"
              >
                Update Task
              </button>
            </div>
          </div>
        </div>

        {/* Right column - Event log */}
        <div className="col-span-1">
          <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark h-full rounded-xs border bg-white">
            <div className="border-stroke dark:border-strokedark flex items-center justify-between border-b px-4 py-4">
              <h5 className="font-medium text-black dark:text-white">
                Event Log
              </h5>
              <button
                type="button"
                onClick={fetchFtpLogs}
                className="hover:text-primary text-gray-500 transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  ></path>
                </svg>
              </button>
            </div>

            <div className="px-4 py-5">
              {/* Replace the existing scrollable container with this improved version */}
              <div className="custom-scrollbar max-h-[calc(100vh-280px)] min-h-[300px] overflow-y-auto">
                {groupedLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <svg
                        className="mx-auto mb-2 h-10 w-10"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p>No event logs found</p>
                      <p className="mt-1 text-xs">
                        Updates to this task will appear here
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Fade indicator at the bottom when scrollable */}
                    <div className="dark:from-boxdark pointer-events-none absolute right-0 bottom-0 left-0 h-8 bg-linear-to-t from-white to-transparent"></div>

                    {/* Timeline line */}
                    <div className="absolute top-0 left-4 h-full w-0.5 bg-gray-200 dark:bg-gray-700"></div>

                    {/* Timeline events */}
                    <div className="space-y-6 pb-8">
                      {groupedLogs.map((log, index) => (
                        <div
                          key={log.id || `log-${index}-${Date.now()}`}
                          className="relative pl-10"
                        >
                          {/* Timeline dot */}
                          <div className="bg-primary dark:border-boxdark absolute top-1.5 left-0 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white">
                            <svg
                              className="h-3.5 w-3.5 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              />
                            </svg>
                          </div>

                          {/* Log content - Organized display with separate files section */}
                          <div className="border-stroke dark:border-strokedark dark:bg-meta-4 rounded-md border bg-gray-50 p-4">
                            {/* 1. Date/Time */}
                            <div className="mb-2">
                              <span className="block font-medium text-black dark:text-white">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>

                            {/* 3. User Message */}
                            {log.notes && (
                              <div className="mb-3">
                                <div className="rounded-r-md border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm dark:border-amber-700 dark:bg-amber-900/10">
                                  <span className="mb-0.5 block font-medium text-amber-800 dark:text-amber-400">
                                    Notes:
                                  </span>
                                  <p className="text-gray-700 dark:text-gray-300">
                                    {log.notes}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* 4. File Attachments - Using the new filesName property */}
                            {log.filesName && log.filesName.length > 0 && (
                              <div className="dark:bg-meta-4/50 mt-2 rounded-sm bg-gray-100 p-2 text-xs">
                                <div className="mb-1.5 flex items-center text-gray-600 dark:text-gray-300">
                                  <svg
                                    className="mr-1.5 h-3.5 w-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                    ></path>
                                  </svg>
                                  <span className="font-medium">
                                    Attachments:
                                  </span>
                                </div>

                                {/* List all files */}
                                <div className="space-y-1 pl-5">
                                  {log.filesName.map((fileName, index) => (
                                    <div
                                      key={`file-${index}`}
                                      className="text-success flex items-center"
                                    >
                                      <span
                                        className="cursor-pointer hover:underline"
                                        onClick={() =>
                                          taskId &&
                                          handleFileClick(
                                            taskId.toString(),
                                            fileName,
                                          )
                                        }
                                      >
                                        {fileName}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Status Change Only (Reduced Upper Space) */}
                            {log.oldValue && log.newValue && (
                              <div className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                <div className="flex items-center gap-2">
                                  {log.oldValue !== log.newValue ? (
                                    <>
                                      <span className="dark:bg-meta-4 rounded-sm bg-gray-100 px-2 py-1 line-through">
                                        {log.oldValue}
                                      </span>
                                      <svg
                                        className="h-3 w-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                                        ></path>
                                      </svg>
                                      <span className="bg-success/10 text-success rounded-sm px-2 py-1 font-medium">
                                        {log.newValue}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="dark:bg-meta-4 rounded-sm bg-gray-100 px-2 py-1 font-medium">
                                      {log.newValue}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 5. Legacy File Display (fallback if filesName not available) */}
                            {!log.filesName &&
                              (log.action?.includes("File Upload") ||
                                log.action?.includes("Attachments")) && (
                                <div className="dark:bg-meta-4/50 mt-2 rounded-sm bg-gray-100 p-2 text-xs">
                                  <div className="text-success flex items-center">
                                    <svg
                                      className="mr-1.5 h-3.5 w-3.5 shrink-0"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                      ></path>
                                    </svg>
                                    <span>
                                      {log.newValue || "File attached"}
                                    </span>
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      {showPreview && previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="dark:bg-boxdark relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => setShowPreview(false)}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>

            <div className="mb-4">
              <h3 className="mb-1 text-lg font-semibold text-black dark:text-white">
                {previewFile.name}
              </h3>
              <div className="flex items-center text-xs text-gray-500">
                <span className="mr-2">
                  {previewFile.type === "image"
                    ? "Image File"
                    : previewFile.type === "pdf"
                      ? "PDF Document"
                      : "Document"}
                </span>
                {!previewFile.url.startsWith("data:") && (
                  <a
                    href={previewFile.url}
                    download={previewFile.name}
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download
                  </a>
                )}
              </div>
            </div>

            <div className="flex justify-center">
              {previewFile &&
              previewFile.url &&
              previewFile.type &&
              (previewFile.type === "image" ||
                previewFile.type.startsWith("image/")) &&
              previewFile.url ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-[70vh] max-w-full object-contain"
                />
              ) : previewFile &&
                previewFile.type === "pdf" &&
                previewFile.url ? (
                <div className="dark:bg-meta-4 w-full rounded-lg bg-gray-100 p-8 text-center">
                  <svg
                    className="mx-auto mb-4 h-16 w-16 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    ></path>
                  </svg>
                  <p className="mb-4">PDF Preview not available</p>
                  <a
                    href={previewFile.url}
                    className="bg-primary hover:bg-opacity-90 rounded-md px-4 py-2 text-white"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open PDF
                  </a>
                </div>
              ) : (
                <div className="dark:bg-meta-4 w-full rounded-lg bg-gray-100 p-8 text-center">
                  <svg
                    className="text-primary mx-auto mb-4 h-16 w-16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                  <p className="mb-4">
                    Preview not available for this file type
                  </p>
                  <a
                    href={previewFile.url}
                    className="bg-primary hover:bg-opacity-90 rounded-md px-4 py-2 text-white"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DefaultLayout>
  );
}

function parseLogFile(content: string): EventLog[] {
  try {
    console.log("Raw log content:", content); // Add this to see the raw content

    // Use a more reliable separator pattern
    const entries = content
      .split(/\-{10,}/)
      .filter((entry) => entry.trim() !== "" && !entry.startsWith("==="));

    const logs: EventLog[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i].trim();
      if (!entry) continue;

      const lines = entry
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (!lines.length) continue;

      // Parse first line for timestamp, user, action, etc.
      const mainLine = lines[0];
      const timestampMatch = mainLine.match(/\[(.*?)\]/);
      if (!timestampMatch) continue;

      const timestamp = timestampMatch[1];
      const afterTimestamp = mainLine
        .substring(timestampMatch[0].length)
        .trim();

      const parts = afterTimestamp.split(" - ");
      if (parts.length < 2) continue;

      const user = parts[0].trim();
      const actionPart = parts[1].trim();

      // Parse action and values
      let action = actionPart;
      let oldValue = "";
      let newValue = "";

      if (actionPart.includes(":")) {
        const [actionText, valuePart] = actionPart.split(":");
        action = actionText.trim();

        if (valuePart && valuePart.includes("→")) {
          const [oldVal, newVal] = valuePart.split("→").map((v) => v.trim());
          oldValue = oldVal;
          newValue = newVal;
        } else if (valuePart) {
          newValue = valuePart.trim();
        }
      }

      // CRITICAL PART: Keep notes and filesName completely separate
      let notes: string | undefined = undefined;
      let filesName: string[] | undefined = undefined;

      // Process remaining lines for Notes and Files
      for (let j = 1; j < lines.length; j++) {
        if (lines[j].startsWith("Notes:")) {
          notes = lines[j].substring("Notes:".length).trim() || undefined;
        } else if (lines[j].startsWith("Files:")) {
          const filesText = lines[j].substring("Files:".length).trim();
          filesName = filesText
            ? filesText
                .split(",")
                .map((f) => f.trim())
                .filter(Boolean)
            : undefined;
        }
      }

      logs.push({
        id: `log-${i}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        timestamp,
        user,
        action,
        oldValue: oldValue || undefined,
        newValue: newValue || undefined,
        notes,
        filesName,
      });
    }

    console.log("Parsed logs:", logs); // Add this to see the result
    return logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  } catch (error) {
    console.error("Error parsing log file:", error);
    return [];
  }
}
