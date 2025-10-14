import { useEffect, useState, useRef } from "react";
import Tables from "@/components/Tables";

export default function AttendanceList() {
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);

  const fetchdata = async () => {
    try {
      const res = await fetch("/api/admin/attendance");
      if (!res.ok) throw new Error("Failed to fetch attendance list");

      const data = await res.json();
      setAttendanceList(data.listAttendance);
    } catch (err) {
      setError("Error fetchin data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasFetchedData.current) {
      fetchdata();
      hasFetchedData.current = true;
    }
  },[]);

  const columnsAttd = [
    { key: "tracking_date", title: "Date" },
    { key: "tracking_day", title: "Day" },
    { key: "employee_name", title: "Employee" },
    { key: "checkin_time", title: "Time In" },
    { key: "Check in Location", title: "Check In Location" },
    { key: "checkout_time", title: "Time Out" },
    { key: "Check out Location", title: "Check Out Location" },
    { key: "total_minutes", title: "Total Hours" },
  ];

  const modalColumns = [
    { group: "Basic Info", key: "attendance_id", title: "ID" },
    { group: "Basic Info", key: "tracking_date", title: "Date &  Day" },
    { group: "Basic Info", key: "employee_name", title: "Employee Name" },

    { group: "Check In Info", key: "checkin_time", title: "Chx in time" },
    { group: "Check In Info", key: "Check in Location", title: "Chx in Location" },
    { group: "Map Info", key: "checkin_latitude", title: "Chx in  Map" },

    { group: "Check Out Info", key: "checkout_time", title: "Chx out time" },
    { group: "Check Out Info", key: "Check out Location", title: "Chx out Location" },
    { group: "Map Info", key: "checkout_latitude", title: "Chx out Map" },
  ];
  return (
    <Tables
      columns={columnsAttd}
      modalTitle="Detail Attendance Info"
      modalColumns={modalColumns}
      data={attendanceList}
      filterKeys={["Check in Location", "Check out Location"]}
      idParam="attendance_id"
      infoEndpoint="/api/admin/attendance"
    />
  );
}
