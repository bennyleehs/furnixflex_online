import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
// import "./styles.css"; // Import the CSS file

interface ProgressTableProps {
  data: any[];
  statusCounts: Record<string, number>;
  totalItems: number;
  pageName: string;
}

export default function ProgressTable({ data, statusCounts, totalItems, pageName }: ProgressTableProps) {
  // Memoize the pipeline stages array
  const pipelineStages = useMemo(() => [
    "Assign PIC",
    "Follow Up", 
    "Visit Showroom", 
    "Quotation", 
    "Deposit", 
    "Production", 
    "Installation", 
    "Job Done"
  ], []); // Empty dependency array since stages are static
  
  // State for task filtering
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  // Add a new state for PIC filtering
  const [selectedPIC, setSelectedPIC] = useState<string | null>(null);
  // Add this after the existing useState declarations
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Extract unique PICs from the data
  const uniquePICs = useMemo(() => {
    const picSet = new Set<string>();
    
    data.forEach(task => {
      // Extract just the name part from the PIC field if it contains "/"
      const picName = task.pic ? task.pic.split('/')[0].trim() : 'Unassigned';
      picSet.add(picName);
    });
    
    return Array.from(picSet).sort();
  }, [data]);
  
  // Calculate stage percentages and prepare data
  const stageData = useMemo(() => {
    // Initialize with zeros
    const counts = pipelineStages.reduce((acc, stage) => {
      acc[stage] = 0;
      return acc;
    }, {} as Record<string, number>);
    
    // Count tasks in each stage
    data.forEach(task => {
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
        weightedProgress
      };
    });
    
    // Calculate overall pipeline progress
    const totalWeightedProgress = stageInfo.reduce((sum, info) => sum + info.weightedProgress, 0);
    const maxPossibleProgress = totalTasks * 1; // 1 = maximum stage weight
    const overallProgress = maxPossibleProgress > 0 
      ? (totalWeightedProgress / maxPossibleProgress) * 100 
      : 0;
    
    return {
      stageInfo,
      overallProgress: Math.round(overallProgress)
    };
  }, [data, totalItems, pipelineStages]);
  
  // Process individual tasks with progress percentage
  const tasksWithProgress = useMemo(() => {
    return data.map(task => {
      const stageIndex = pipelineStages.indexOf(task.status);
      const progressPercentage = stageIndex >= 0 
        ? Math.round(((stageIndex + 1) / pipelineStages.length) * 100) 
        : 0;
        
      return {
        ...task,
        progressPercentage,
        stageIndex
      };
    }).sort((a, b) => b.progressPercentage - a.progressPercentage); // Sort by progress descending
  }, [data, pipelineStages]);
  
  // Update the displayedTasks memo to include search functionality
  const displayedTasks = useMemo(() => {
    let filtered = tasksWithProgress;
    
    // Apply stage filter if selected
    if (selectedStage) {
      filtered = filtered.filter(task => task.status === selectedStage);
    }
    
    // Apply PIC filter if selected
    if (selectedPIC) {
      filtered = filtered.filter(task => {
        const picName = task.pic ? task.pic.split('/')[0].trim() : 'Unassigned';
        return picName === selectedPIC;
      });
    }
    
    // Apply search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(task => {
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
    <div className="rounded-lg border border-stroke bg-gray-50 p-5 shadow-default dark:border-strokedark dark:bg-meta-4 mb-5">
      {/* Header with Pipeline Flow title and breadcrumb on right */}
      <div className="flex flex-wrap justify-between items-center mb-4">
        {/* Title on left */}
        <h4 className="text-md font-medium">Pipeline Flow</h4>
        
        {/* Breadcrumb on right */}
        <div className="text-sm">
          <Breadcrumb pageName={pageName} noHeader={true} />
        </div>
      </div>
      
      {/* Pipeline flow visualization with responsive layout */}
      <div className="mb-6">
        {/* Hidden the heading as we moved it to the top level */}
        {/* <h4 className="text-md font-medium mb-2">Pipeline Flow</h4> */}
        
        {/* Desktop view - full pipeline */}
        <div className="hidden md:flex relative py-4 border-b border-stroke dark:border-strokedark mb-1">
          {stageData.stageInfo.map((info, index) => {
            // Determine color based on stage
            let bgColorClass = "bg-primary";
            let textColorClass = "text-white";
            
            if (info.stage === "Job Done") bgColorClass = "bg-success";
            else if (["Deposit", "Production", "Installation"].includes(info.stage)) {
              bgColorClass = "bg-warning";
            }
            
            return (
              <div 
                key={info.stage} 
                className="flex-1 flex flex-col items-center text-center px-1 cursor-pointer min-w-0"
                onClick={() => setSelectedStage(selectedStage === info.stage ? null : info.stage)}
              >
                {/* Circular count indicator with dark-mode compatible border highlight */}
                <div className="relative">
                  <div 
                    className={`h-10 w-10 rounded-full ${bgColorClass} ${textColorClass} flex items-center justify-center font-medium text-sm shadow-md 
                      ${selectedStage === info.stage 
                        ? `scale-110 transform ring-4 ring-offset-2 ring-offset-white dark:ring-offset-boxdark ${
                            info.stage === "Job Done" 
                              ? 'ring-success' 
                              : (["Deposit", "Production", "Installation"].includes(info.stage) 
                                ? 'ring-warning' 
                                : 'ring-primary')
                          }` 
                        : ''} 
                      transition-all duration-200`}
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
                <div className="text-xs text-gray-500 mt-2 flex flex-col items-center w-full">
                  <span className="font-medium">{index + 1}</span>
                  <span className="text-[13px] truncate w-full">{info.stage}</span>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Mobile view - condensed pipeline */}
        <div className="md:hidden flex flex-wrap justify-center gap-3 py-4 border-b border-stroke dark:border-strokedark mb-1">
          {stageData.stageInfo.map((info, index) => {
            // Determine color based on stage
            let bgColorClass = "bg-primary";
            let textColorClass = "text-white";
            
            if (info.stage === "Job Done") bgColorClass = "bg-success";
            else if (["Deposit", "Production", "Installation"].includes(info.stage)) {
              bgColorClass = "bg-warning";
            }
            
            return (
              <div 
                key={info.stage} 
                className="flex flex-col items-center cursor-pointer"
                onClick={() => setSelectedStage(selectedStage === info.stage ? null : info.stage)}
              >
                {/* Compact display for mobile */}
                <div 
                  className={`h-9 w-9 rounded-full ${bgColorClass} ${textColorClass} flex items-center justify-center font-medium text-xs shadow-md 
                    ${selectedStage === info.stage ? 'ring-2 ring-offset-1' : ''}`}
                >
                  {index + 1}
                </div>
                <div className="text-[10px] text-gray-500 mt-1 text-center max-w-[60px] truncate">
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
        <div className="flex flex-wrap justify-between items-center">
          {/* Sales rep filters with dark mode support */}
          <div className="flex flex-wrap gap-2 mb-2 md:mb-0">
            <button 
              className={`px-3 py-1 text-xs rounded-full ${
                !selectedPIC 
                  ? 'bg-indigo-600 text-white dark:bg-indigo-700' 
                  : 'bg-gray-100 text-gray-700 dark:bg-meta-4 dark:text-gray-300'
              }`}
              onClick={() => setSelectedPIC(null)}
            >
              All Sales Reps ({tasksWithProgress.length})
            </button>
            {uniquePICs.map(pic => {
              // Calculate how many tasks are assigned to this PIC
              const picTaskCount = tasksWithProgress.filter(task => {
                const picName = task.pic ? task.pic.split('/')[0].trim() : 'Unassigned';
                return picName === pic;
              }).length;
              
              return (
                <button 
                  key={pic}
                  className={`px-3 py-1 text-xs rounded-full ${
                    selectedPIC === pic 
                      ? 'bg-indigo-600 text-white dark:bg-indigo-700' 
                      : 'bg-gray-100 text-gray-700 dark:bg-meta-4 dark:text-gray-300'
                  } flex items-center`}
                  onClick={() => setSelectedPIC(selectedPIC === pic ? null : pic)}
                >
                  <span>{pic}</span>
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                    selectedPIC === pic 
                      ? 'bg-indigo-400/30 text-white dark:bg-indigo-300/30' 
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                  }`}>
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
              className="w-full px-3 py-1 text-sm border border-stroke dark:border-strokedark rounded-md focus:outline-hidden focus:border-primary dark:bg-meta-4 dark:text-white"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {!searchQuery && (
              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Individual task progress */}
      <h4 className="text-md font-medium mb-3">
        {selectedStage && selectedPIC 
          ? `Tasks for ${selectedPIC} in ${selectedStage} Stage`
          : selectedStage 
            ? `Tasks in ${selectedStage} Stage` 
            : selectedPIC
              ? `Tasks for ${selectedPIC}`
              : 'Recent Tasks Progress'
        }
        <span className="ml-2 text-sm text-gray-500">({displayedTasks.length} tasks)</span>
      </h4>

      {/* Changed from space-y-3 to grid with 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {displayedTasks.map((task) => {
          // Determine color based on progress
          let colorClass = "bg-primary";
          if (task.progressPercentage >= 100) colorClass = "bg-success";
          else if (task.progressPercentage >= 50) colorClass = "bg-warning";
          
          // Parse composite fields into components
          const [name, nric] = (task.name || '').split('/').map((s: string) => s.trim());
          const [phone1, phone2, email] = (task.contact || '').split('/').map((s: string) => s.trim());
          const [sourceName, interested, addInfo] = (task.source || '').split('/').map((s: string) => s.trim());
          const [salesName, salesUid] = (task.pic || '').split('/').map((s: string) => s.trim());
          
          return (
            <div key={task.id} className="bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded-md p-3">
              {/* Enhanced header with name, NRIC, and contact details inline */}
              <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                <div className="flex-1">
                  {/* Name and NRIC line with contact details */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="font-medium text-black dark:text-white">{name}</h5>
                    {nric && (
                      <span className="text-xs bg-gray-50 dark:bg-meta-4 px-1.5 py-0.5 rounded-sm border border-stroke dark:border-strokedark">
                        {nric}
                      </span>
                    )}
                    
                    {/* Contact details inline */}
                    {phone1 && (
                      <span className="text-xs flex items-center">
                        <svg className="h-3.5 w-3.5 text-green-500 mr-1" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12C2 13.9 2.5 15.7 3.4 17.2L2.1 21.3C2 21.7 2.3 22 2.7 22L6.8 20.7C8.3 21.5 10.1 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM8.5 14.1C9.2 15.3 10.6 16.8 12.6 16.9C14.1 17 15.4 15.6 16.4 15.5C16.9 15.5 17.4 15.7 18 16L18.5 16.3L16.4 17.1C15.4 17.5 14.3 17.7 13.2 17.7C10.4 17.7 7.8 16.2 6.5 14C5.9 13.1 5.7 12.1 5.7 11.1C5.7 9.70002 6.2 8.40002 7.1 7.40002L7.5 7.00002L8.5 9.00002V9.80002C8.5 10.1 8.3 10.4 8 10.6L7.8 10.7L7.9 10.9C8.1 11.1 8.2 11.2 8.3 11.4L8.5 11.7L8.7 11.5C9.1 11.2 9.6 11 10.1 10.8C10.6 10.7 11 10.4 11.3 10.1C12.1 9.30002 12 8.30002 11.2 7.60002C10.4 6.90002 9.2 6.90002 8.4 7.60002L7.9 8.10002L7.4 6.80002C8.1 6.30002 9 6.00002 9.9 6.00002C11.9 6.10002 13.3 7.60002 14 8.80002L14.2 9.00002L14 9.20002C13.9 9.30002 13.9 9.40002 13.8 9.50002L13.5 9.80002C12.9 10.4 12.6 11.3 12.8 12.1C13 12.8 13.5 13.3 14.2 13.5C14.4 13.6 14.6 13.6 14.8 13.6C15.1 13.6 15.5 13.5 15.8 13.3L16.1 13.1L16.3 13.3C16.7 13.7 17 14.2 17.1 14.7L17.2 15.5L16.7 15.3C16.1 15 15.5 14.8 14.8 14.8C13.7 14.9 12.7 15.7 11.5 15.7C10.3 15.6 9.1 14.5 8.6 13.8L8.5 14.1Z" />
                        </svg>
                        {phone1}
                      </span>
                    )}
                    {phone2 && (
                      <span className="text-xs flex items-center">
                        <svg className="h-3 w-3 text-gray-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                        {phone2}
                      </span>
                    )}
                    
                    {email && (
                      <span className="text-xs flex items-center">
                        <svg className="h-3 w-3 text-gray-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                        <span className="truncate max-w-[150px]">{email}</span>
                      </span>
                    )}
                  </div>
                  
                  {/* Full address on its own row */}
                  {task.address && (
                    <div className="flex items-start mt-1.5 text-xs">
                      <svg className="h-3.5 w-3.5 text-red-500 mt-0.5 mr-1.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-600 dark:text-gray-300 break-words">{task.address}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center">
                    <button
                    className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap flex items-center gap-1 ${
                      task.status === "Job Done" ? 'bg-success/20 text-success hover:bg-success/30 dark:bg-success/30 dark:hover:bg-success/40' :
                      ["Deposit", "Production", "Installation"].includes(task.status) ? 'bg-warning/20 text-warning hover:bg-warning/30 dark:bg-warning/30 dark:hover:bg-warning/40' :
                      'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-700/30 dark:text-indigo-300 dark:hover:bg-indigo-700/40'
                    } transition-colors`}
                    onClick={() => window.location.href = `/sales/task/edit?id=${task.id}`}
                    title="Update task status"
                    >
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Update
                    </button>
                </div>
              </div>
              
              {/* Source Info - horizontal and inline layout */}
              <div className="pt-0.5 pb-2.5 px-3 bg-gray-50 dark:bg-meta-4 rounded-sm">
                <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                  <span className="font-medium text-sm">Source Info: </span>
                  {sourceName && <span className="text-gray-700 dark:text-gray-300">{sourceName} /</span>}
                  {interested && <span className="text-gray-700 dark:text-gray-300">{interested} /</span>}
                  {addInfo && <span className="text-gray-700 dark:text-gray-300">{addInfo}</span>}
                </div>
              </div>

              {/* Progress section */}
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium">Progress</span>
                <span className="text-xs font-medium">{task.progressPercentage}%</span>
              </div>

              <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${colorClass} rounded-full transition-all duration-300`}
                  style={{ width: `${task.progressPercentage}%` }} 
                />
              </div>

              {/* Pipeline position indicator */}
              <div className="flex items-center justify-between mt-2 mb-3">
                {pipelineStages.map((stage, index) => (
                  <div 
                    key={stage}
                    className={`h-1.5 w-1.5 rounded-full ${index <= task.stageIndex ? colorClass : 'bg-gray-200'}`}
                    title={stage}
                  />
                ))}
              </div>

              {/* Person-In-Charge moved to bottom */}
              <div className="text-xs mt-3 pt-3 border-t border-stroke dark:border-strokedark">
                <div className="flex justify-between items-center">
                  {/* ID, date and UID line */}
                  <div className="flex flex-wrap items-center text-xs text-gray-500 mt-1 gap-x-3">
                    <span>ID: {task.id}</span>
                  </div>
                 <div className="flex items-center">
                    <svg className="h-3 w-3 text-gray-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.660.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <span className="font-medium">PIC:</span>
                    <span className="ml-1">{salesName || 'Unassigned'}</span>
                    {salesUid && <span className="text-gray-500">, {salesUid}</span>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                    task.status === "Job Done" ? 'bg-success/10 text-success' :
                    ["Deposit", "Production", "Installation"].includes(task.status) ? 'bg-warning/10 text-warning' :
                    'bg-primary/10 text-primary'
                  }`}>{task.status}</span>
                </div>
              </div>
            </div>
          );
        })}
        
        {displayedTasks.length === 0 && (
          <div className="text-center py-8 text-gray-500 col-span-2">
            No tasks found in this stage.
          </div>
        )}
      </div>
      
      {/* Show more link */}
      {!selectedStage && tasksWithProgress.length > 12 && (
        <div className="text-center mt-4">
          <Link href="/sales/task" className="text-primary hover:underline">
            View all {tasksWithProgress.length} tasks
          </Link>
        </div>
      )}
    </div>
  );
}