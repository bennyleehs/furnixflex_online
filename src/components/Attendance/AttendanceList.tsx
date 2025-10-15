import { useEffect, useState, useRef, useCallback } from "react";
import Tables from "@/components/Tables";

export default function AttendanceList() {
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);
  const [currentPage, setCurrentPage] = useState(1);

  // This helper function remains the same. It correctly parses ISO strings.
  const formatDateTime = (
    isoString: string | Date | null | undefined,
    options: Intl.DateTimeFormatOptions,
  ) => {
    if (!isoString) return "N/A";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "Invalid Date";
      let formatted = new Intl.DateTimeFormat("en-GB", options).format(date);
      //dd-mm-yyyy
      // formatted = formatted.replace(/\//g, "-");
      // Replace lowercase am/pm with uppercase AM/PM
      formatted = formatted.replace(/\b(am|pm)\b/i, (match) =>
        match.toUpperCase(),
      );
      return formatted;
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Error";
    }
  };

  const fetchdata = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/attendance");
      if (!res.ok) throw new Error("Failed to fetch attendance list");

      const data = await res.json();

      // --- NEW: PRE-FORMAT THE DATA HERE ---
      // We loop through the fetched data and create new properties for display.
      // This is more reliable than using a render prop.
      const formattedData = data.listAttendance.map((item: any) => {
        // Your current location (Malaysia) is UTC+8.
        // checkinISO: ...T01:16:22Z -> 1:16 AM UTC -> 9:16 AM in Malaysia.
        // checkoutISO: ...T02:24:37Z -> 2:24 AM UTC -> 10:24 AM in Malaysia.
        // This confirms the conversion logic is working as expected.

        // Calculate total_minutes to hour & minute
        const totalMinutes = item.total_minutes || 0; // Use 0 if total_minutes is null/undefined
        // Calculate hours and minutes
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        // Format the output string
        const hoursDisplay = hours > 0 ? `${hours} hr` : "";
        const minutesDisplay = minutes > 0 ? `${minutes} min` : "";
        // Combine parts
        const totalTimeDisplay = [hoursDisplay, minutesDisplay]
          .filter(Boolean)
          .join(" ");

        // If total_minutes was 0 (or null/undefined), display a default message
        const finalTimeDisplay = totalTimeDisplay || "0 hr 0 min";

        return {
          ...item, // Keep all original data
          // Create new properties specifically for the table display
          displayDate: formatDateTime(item.checkinISO || item.checkoutISO, {
            year: "numeric",
            month: "numeric",
            day: "numeric",
          }),
          displayDay: formatDateTime(item.checkinISO || item.checkoutISO, {
            weekday: "long",
          }),
          displayCheckin: formatDateTime(item.checkinISO, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true, // Use AM/PM format
          }),
          displayCheckout: formatDateTime(item.checkoutISO, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true, // Use AM/PM format
          }),
          displayTotalHour: finalTimeDisplay,
        };
      });

      setAttendanceList(formattedData);
    } catch (err) {
      setError("Error fetching data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  },[]);

  useEffect(() => {
    if (!hasFetchedData.current) {
      fetchdata();
      hasFetchedData.current = true;
    }
  }, [fetchdata]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const columnsAttd = [
    { key: "displayDate", title: "Date" },
    { key: "displayDay", title: "Day" },
    { key: "employee_name", title: "Employee" },
    { key: "displayCheckin", title: "Time In" },
    { key: "Check in Location", title: "Check In Location" },
    { key: "displayCheckout", title: "Time Out" },
    { key: "Check out Location", title: "Check Out Location" },
    { key: "displayTotalHour", title: "Total Hours" },
  ];

  const modalColumns = [
    { group: "Basic Info", key: "attendance_id", title: "ID" },
    {
      group: "Basic Info",
      key: "displayDateAndDay",
      title: "Date &  Day",
      format: (_: any, row: any) => {
        const date = formatDateTime(row.checkinISO || row.checkoutISO, {
          year: "numeric",
          month: "numeric",
          day: "numeric",
        });
        const day = formatDateTime(row.checkinISO || row.checkoutISO, {
          weekday: "long",
        });
        return `${date}, ${day}`;
      },
    },
    { group: "Basic Info", key: "employee_name", title: "Employee Name" },

    {
      group: "Check In Info",
      key: "displayCheckin", 
      title: "Time In",
      format: (_: any, row: any) => 
        formatDateTime(row.checkinISO, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true, // Ensures AM/PM display
        }),
    },
    {
      group: "Check In Info",
      key: "Check in Location",
      title: "Check in Location",
    },
    { group: "Map 1 Info", key: "checkin_latitude", title: "Check in Map" },
    { group: "Map 1 Info", key: "checkin_longitude", title: "Check in Map" },

    {
      group: "Check Out Info",
      key: "displayCheckout",
      title: "Time Out",
      format: (_: any, record: any) =>
        formatDateTime(record.checkoutISO, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true, // Ensures AM/PM display
        }),
    },
    {
      group: "Check Out Info",
      key: "Check out Location",
      title: "Check out Location",
    },
    { group: "Map 2 Info", key: "checkout_latitude", title: "Check out Map" },
    { group: "Map 2 Info", key: "checkout_longitude", title: "Check out Map" },
  ];
  return (
    <Tables
      columns={columnsAttd}
      modalTitle="Detail Attendance Info"
      modalColumns={modalColumns}
      data={attendanceList}
      filterKeys={["Check in Location", "Check out Location"]}
      idParam="attendance_id"
      currentPage={currentPage}
      onPageChange={handlePageChange}
      totalItems={attendanceList.length}
      itemsPerPage={10}
      infoEndpoint="/api/admin/attendance"
    />
  );
}
