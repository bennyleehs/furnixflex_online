import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import AttendanceTracker from "@/components/Attendance/AttendanceTracker";
import SalesCard from "@/components/SalesCard";

export const metadata: Metadata = {
  title:
    "Classypro Dashboard",
  description: "Classy Project Marketing Dashboard",
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
