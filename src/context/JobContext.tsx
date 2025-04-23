"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface JobContextType {
  expiredCount: number;
  nearExpiryCount: number;
  activeCount: number;
  setJobCounts: (expired: number, nearExpiry: number, active: number) => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const [expiredCount, setExpiredCount] = useState(0);
  const [nearExpiryCount, setNearExpiryCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  const setJobCounts = (expired: number, nearExpiry: number, active: number) => {
    setExpiredCount(expired);
    setNearExpiryCount(nearExpiry);
    setActiveCount(active);
  };

  return (
    <JobContext.Provider value={{ expiredCount, nearExpiryCount, activeCount, setJobCounts }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJobCounts() {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error("useJobCounts must be used within a JobProvider");
  }
  return context;
}
