'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import DefaultLayout from "@/components/Layouts/DefaultLayout";

// Define the event log interface
interface EventLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  notes?: string;
}

// Define the task interface based on your existing structure
interface Task {
  id: string;
  name: string;
  contact: string;
  address?: string;
  source?: string;
  pic?: string;
  status: string;
  progressPercentage: number;
  stageIndex: number;
  createdAt: string;
  updatedAt: string;
}

export default function TaskEditPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const taskId = searchParams.get('id');
  
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [updateNote, setUpdateNote] = useState('');
  const hasFetchedData = useRef(false);
  
  // Pipeline stages from your existing app
  const pipelineStages = [
    "Assign PIC",
    "Follow Up", 
    "Visit Showroom", 
    "Quotation", 
    "Deposit", 
    "Production", 
    "Installation", 
    "Job Done"
  ];
  
  // Fetch task data
  useEffect(() => {
    async function fetchTask() {
      try {
        if (!taskId) {
          throw new Error('No task ID provided');
        }
        
        // Replace with your actual API endpoint
        const response = await fetch(`/api/sales/task?id=${taskId}`);
        if (!response.ok) throw new Error('Failed to fetch task');
        
        const responseData = await response.json();
        
        if (responseData.listTask) {
          setTask(responseData.listTask[0]);
        } else {
          throw new Error('No task data found');
        }
        
        // Also fetch event logs
        const logsResponse = await fetch(`/api/sales/task/logs?id=${taskId}`);
        if (logsResponse.ok) {
          const logsData = await logsResponse.json();
          if (logsData.logs) {
            setEventLogs(logsData.logs);
          }
        }
      } catch (error) {
        console.error('Error fetching task:', error);
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    
    if (!hasFetchedData.current && taskId) {
      fetchTask();
      hasFetchedData.current = true;
    }
  }, [taskId]);
  
  // Parse composite fields if needed
  const [name, nric] = task?.name ? task.name.split('/').map(s => s.trim()) : ['', ''];
  const [phone1, phone2, email] = task?.contact ? task.contact.split('/').map(s => s.trim()) : ['', '', ''];
  const [sourceName, interested, addInfo] = task?.source ? task.source.split('/').map(s => s.trim()) : ['', '', ''];
  const [salesName, salesUid] = task?.pic ? task.pic.split('/').map(s => s.trim()) : ['', ''];
  
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
        progressPercentage: Math.round(((pipelineStages.indexOf(newStatus) + 1) / pipelineStages.length) * 100)
      });
      
      // Add to event logs optimistically
      const newLog: EventLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user: 'Current User', // Replace with actual user
        action: 'Status Update',
        oldValue: oldStatus,
        newValue: newStatus,
        notes: updateNote
      };
      
      setEventLogs([newLog, ...eventLogs]);
      setUpdateNote('');
      
      // API call to update backend
      const response = await fetch(`/api/sales/task/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: taskId,
          status: newStatus,
          notes: updateNote
        }),
      });
      
      if (!response.ok) throw new Error('Failed to update task');
    } catch (error) {
      console.error('Error updating task:', error);
      // Show error notification
    }
  };
  
  if (loading) {
    return (
      <DefaultLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DefaultLayout>
    );
  }
  
  if (!task) {
    return (
      <DefaultLayout>
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-danger">Task not found</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">The requested task could not be found.</p>
          <button 
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90"
            onClick={() => router.push('/sales/task')}
          >
            Back to Tasks
          </button>
        </div>
      </DefaultLayout>
    );
  }
  
  // Determine color based on progress
  let colorClass = "bg-primary";
  if (task.progressPercentage >= 100) colorClass = "bg-success";
  else if (task.progressPercentage >= 50) colorClass = "bg-warning";
  
  return (
    <DefaultLayout>
      <Breadcrumb pageName={`Update Task #${taskId}`} />
      
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Left column - Task details */}
        <div className="md:col-span-2">
          <div className="rounded-xs border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke pb-5 dark:border-strokedark">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-black dark:text-white">
                  {name}
                </h2>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  task.status === "Job Done" ? 'bg-success/20 text-success dark:bg-success/10' :
                  ["Deposit", "Production", "Installation"].includes(task.status) ? 'bg-warning/20 text-warning dark:bg-warning/10' :
                  'bg-primary/20 text-primary dark:bg-primary/10'
                }`}>
                  {task.status}
                </span>
              </div>
            </div>
            
            {/* Task details */}
            <div className="py-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <h5 className="mb-3 text-sm font-medium text-black dark:text-white">Contact Information</h5>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center">
                      <span className="text-gray-500 dark:text-gray-400 w-24">Name:</span>
                      <span className="font-medium">{name}</span>
                    </div>
                    {nric && (
                      <div className="flex items-center">
                        <span className="text-gray-500 dark:text-gray-400 w-24">NRIC:</span>
                        <span className="font-medium">{nric}</span>
                      </div>
                    )}
                    {phone1 && (
                      <div className="flex items-center">
                        <span className="text-gray-500 dark:text-gray-400 w-24">WhatsApp:</span>
                        <span className="font-medium flex items-center">
                          <svg className="h-3.5 w-3.5 text-green-500 mr-1" viewBox="0 0 24 24" fill="currentColor">
                            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12C2 13.9 2.5 15.7 3.4 17.2L2.1 21.3C2 21.7 2.3 22 2.7 22L6.8 20.7C8.3 21.5 10.1 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM8.5 14.1C9.2 15.3 10.6 16.8 12.6 16.9C14.1 17 15.4 15.6 16.4 15.5C16.9 15.5 17.4 15.7 18 16L18.5 16.3L16.4 17.1C15.4 17.5 14.3 17.7 13.2 17.7C10.4 17.7 7.8 16.2 6.5 14C5.9 13.1 5.7 12.1 5.7 11.1C5.7 9.70002 6.2 8.40002 7.1 7.40002L7.5 7.00002L8.5 9.00002V9.80002C8.5 10.1 8.3 10.4 8 10.6L7.8 10.7L7.9 10.9C8.1 11.1 8.2 11.2 8.3 11.4L8.5 11.7L8.7 11.5C9.1 11.2 9.6 11 10.1 10.8C10.6 10.7 11 10.4 11.3 10.1C12.1 9.30002 12 8.30002 11.2 7.60002C10.4 6.90002 9.2 6.90002 8.4 7.60002L7.9 8.10002L7.4 6.80002C8.1 6.30002 9 6.00002 9.9 6.00002C11.9 6.10002 13.3 7.60002 14 8.80002L14.2 9.00002L14 9.20002C13.9 9.30002 13.9 9.40002 13.8 9.50002L13.5 9.80002C12.9 10.4 12.6 11.3 12.8 12.1C13 12.8 13.5 13.3 14.2 13.5C14.4 13.6 14.6 13.6 14.8 13.6C15.1 13.6 15.5 13.5 15.8 13.3L16.1 13.1L16.3 13.3C16.7 13.7 17 14.2 17.1 14.7L17.2 15.5L16.7 15.3C16.1 15 15.5 14.8 14.8 14.8C13.7 14.9 12.7 15.7 11.5 15.7C10.3 15.6 9.1 14.5 8.6 13.8L8.5 14.1Z" />
                          </svg>
                          {phone1}
                        </span>
                      </div>
                    )}
                    {phone2 && (
                      <div className="flex items-center">
                        <span className="text-gray-500 dark:text-gray-400 w-24">Phone:</span>
                        <span className="font-medium">{phone2}</span>
                      </div>
                    )}
                    {email && (
                      <div className="flex items-center">
                        <span className="text-gray-500 dark:text-gray-400 w-24">Email:</span>
                        <span className="font-medium">{email}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h5 className="mb-3 text-sm font-medium text-black dark:text-white">Source & Assignment</h5>
                  <div className="space-y-2.5 text-sm">
                    {sourceName && (
                      <div className="flex items-center">
                        <span className="text-gray-500 dark:text-gray-400 w-24">Source:</span>
                        <span className="font-medium">{sourceName}</span>
                      </div>
                    )}
                    {interested && (
                      <div className="flex items-center">
                        <span className="text-gray-500 dark:text-gray-400 w-24">Interest:</span>
                        <span className="font-medium">{interested}</span>
                      </div>
                    )}
                    {addInfo && (
                      <div className="flex items-center">
                        <span className="text-gray-500 dark:text-gray-400 w-24">Additional:</span>
                        <span className="font-medium">{addInfo}</span>
                      </div>
                    )}
                    {salesName && (
                      <div className="flex items-center">
                        <span className="text-gray-500 dark:text-gray-400 w-24">Assigned to:</span>
                        <span className="font-medium">{salesName}{salesUid ? ` (${salesUid})` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {task.address && (
                <div className="mt-5">
                  <h5 className="mb-3 text-sm font-medium text-black dark:text-white">Address</h5>
                  <p className="text-sm font-medium">
                    <span className="flex items-start">
                      <svg className="h-4 w-4 text-red-500 mt-0.5 mr-2 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      {task.address}
                    </span>
                  </p>
                </div>
              )}
              
              {/* Progress indicator */}
              <div className="mt-8">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="text-sm font-medium text-black dark:text-white">Progress</h5>
                  <span className="text-sm font-medium">{task.progressPercentage}%</span>
                </div>
                
                <div className="h-3 w-full bg-gray-200 dark:bg-meta-4 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${colorClass} rounded-full transition-all duration-300`}
                    style={{ width: `${task.progressPercentage}%` }} 
                  />
                </div>
                
                {/* Pipeline stages */}
                <div className="flex items-center justify-between mt-5 mb-3">
                  {pipelineStages.map((stage, index) => (
                    <div 
                      key={stage}
                      className={`flex flex-col items-center cursor-pointer ${
                        task.status === stage ? 'transform scale-110' : ''
                      }`}
                      onClick={() => handleStatusUpdate(stage)}
                    >
                      <div 
                        className={`h-2.5 w-2.5 rounded-full ${
                          index <= task.stageIndex ? colorClass : 'bg-gray-200 dark:bg-gray-600'
                        } mb-1.5 ${
                          task.status === stage ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                        }`}
                        title={stage}
                      />
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center max-w-[50px] truncate">
                        {stage}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Update form */}
            <div className="border-t border-stroke pt-5 dark:border-strokedark">
              <h5 className="mb-3 text-sm font-medium text-black dark:text-white">Update Status</h5>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="w-full">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Status
                  </label>
                  <div className="relative z-20 bg-transparent">
                    <select 
                      className="relative z-20 w-full appearance-none rounded-sm border border-stroke bg-transparent py-2 px-5 outline-hidden transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      value={task.status}
                      onChange={(e) => handleStatusUpdate(e.target.value)}
                    >
                      {pipelineStages.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-4 top-1/2 z-30 -translate-y-1/2">
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
                
                <div className="w-full">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Update Note
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Add a note about this update"
                      value={updateNote}
                      onChange={(e) => setUpdateNote(e.target.value)}
                      className="w-full rounded-lg border border-stroke bg-transparent py-2 pl-6 pr-10 outline-hidden focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right column - Event log */}
        <div className="col-span-1">
          <div className="rounded-xs border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark h-full">
            <div className="border-b border-stroke px-4 py-4 dark:border-strokedark">
              <h5 className="font-medium text-black dark:text-white">
                Event Log
              </h5>
            </div>
            
            <div className="px-4 py-5">
              <div className="max-h-[600px] overflow-auto">
                {eventLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="text-gray-500 dark:text-gray-400 text-center">
                      <svg className="h-10 w-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p>No event logs found</p>
                      <p className="text-xs mt-1">Updates to this task will appear here</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                    
                    {/* Timeline events */}
                    <div className="space-y-6">
                      {eventLogs.map((log) => (
                        <div key={log.id} className="relative pl-10">
                          {/* Timeline dot */}
                          <div className="absolute left-0 top-1.5 h-8 w-8 rounded-full border-4 border-white bg-primary dark:border-boxdark flex items-center justify-center">
                            <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </div>
                          
                          {/* Event content */}
                          <div className="rounded-md border border-stroke bg-gray-50 p-4 dark:border-strokedark dark:bg-meta-4">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm font-medium text-black dark:text-white">
                                {log.action}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            
                            {log.oldValue && log.newValue && (
                              <div className="mb-3 text-sm">
                                <span className="font-medium">Changed from </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                  log.oldValue === "Job Done" ? 'bg-success/10 text-success' :
                                  ["Deposit", "Production", "Installation"].includes(log.oldValue) ? 'bg-warning/10 text-warning' :
                                  'bg-primary/10 text-primary'
                                }`}>
                                  {log.oldValue}
                                </span>
                                <span className="font-medium"> to </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                  log.newValue === "Job Done" ? 'bg-success/10 text-success' :
                                  ["Deposit", "Production", "Installation"].includes(log.newValue) ? 'bg-warning/10 text-warning' :
                                  'bg-primary/10 text-primary'
                                }`}>
                                  {log.newValue}
                                </span>
                              </div>
                            )}
                            
                            {log.notes && (
                              <div className="text-sm text-gray-600 dark:text-gray-300">
                                &quot;{log.notes}&quot;
                              </div>
                            )}
                            
                            <div className="mt-2 text-xs text-gray-500">
                              By {log.user}
                            </div>
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
    </DefaultLayout>
  );
}