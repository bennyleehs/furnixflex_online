"use client";

import { useEffect, useState } from "react";
import TablesTwo from "@/components/Tables/TablesTwo";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
// import { useJobCounts } from "@/context/JobContext";
import JobLegend from "@/components/JobLegend";

interface Job {
  quotation_id: string;
  // branch_code: string;
  // yymm: string;
  // invoice_number: string;
  jobInvc_no: string;
  pic_name: string;
  quotation_customer_name: string;
  quotation_customer_address: string;
  quotation_status: string;
  quotation_installation_date: string;
  formattedDate: string;
}

export default function JobPage() {
  const [jobs, setListings] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  // const { setJobCounts } = useJobCounts(); // Use context to update counts

  //differentiate the urgencies
  const isExpired = (installationDate: string): boolean => {
    const currentDate = new Date();
    const installDate = new Date(installationDate);
    return installDate < currentDate;
  };

  const isNearExpiry = (installationDate: string): boolean => {
    const currentDate = new Date();
    const installDate = new Date(installationDate);
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(currentDate.getDate() + 21);
    return installDate >= currentDate && installDate <= twoWeeksFromNow;
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const fetchListings = async () => {
      try {
        const res = await fetch("/api/dashboard/jobsReport");
        if (!res.ok) {
          throw new Error("Failed to fetch jobs");
        }

        const data = await res.json();
        setListings(data.listJobs); // Assumes the API returns
      } catch (error) {
        setError((error as Error).message);
      }
    };

    const startFetching = () => {
      fetchListings();
      intervalId = setInterval(fetchListings, 60000); //60 seconds
    };

    const stopFetching = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // start fetching data
    startFetching();

    return () => {
      // clear when not to mount the data
      stopFetching();
    };
  }, []);

  if (error) {
    return <p>Error: {error}</p>;
  }

  // const { expiredCount, nearExpiryCount, activeCount } = useJobCounts();

  const columns = [
    { key: "jobInvc_no", title: "JOB NO." },
    { key: "pic_name", title: "PIC" },
    { key: "quotation_customer_name", title: "CUSTOMER NAME" },
    { key: "quotation_customer_address", title: "ADDRESS" },
    { key: "quotation_status", title: "STATUS" },
    { key: "formattedDate", title: "INSTALL/N DATE" },
  ];

  //row styling [expired, near expired, active]
  const getRowClassName = (row: Record<string, any>) => {
    const job = row as Job //assertion
    if (isExpired(job.formattedDate)) return "bg-[#CE3B27] opacity-90 dark:opacity-80 text-white";
    if (isNearExpiry(job.formattedDate)) return "bg-[#FCC55A] text-black";
    return "bg-green-500 text-black";
  };

  return (
    <DefaultLayout>
      <TablesTwo
        columns={columns}
        data={jobs}
        rowClassName={getRowClassName}
        detailTitle={"Ongoing Jobs"}
      />
    </DefaultLayout>
  );
}
