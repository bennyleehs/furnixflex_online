import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import AttendanceTracker from "@/components/Attendance/AttendanceTracker";
import SalesCard from "@/components/SalesCard";

export const metadata: Metadata = {
  title:
    "Next.js E-commerce Dashboard | TailAdmin - Next.js Dashboard Template",
  description: "This is Next.js Home for TailAdmin Dashboard Template",
};

export default function Home() {
  return (
    <>
      <DefaultLayout>
        <AttendanceTracker />
        <SalesCard />
      </DefaultLayout>
    </>
  );
}
