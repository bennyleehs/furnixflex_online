// import { useEffect, useState, useRef } from "react";
// import Tables from "@/components/Tables";

// export default function AttendanceList() {
//   const [attendanceList, setAttendanceList] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const hasFetchedData = useRef(false);

//   const fetchdata = async () => {
//     try {
//       const res = await fetch("/api/admin/attendance");
//       if (!res.ok) throw new Error("Failed to fetch attendance list");

//       const data = await res.json();
//       setAttendanceList(data.listAttendance);
//     } catch (err) {
//       setError("Error fetchin data");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (!hasFetchedData.current) {
//       fetchdata();
//       hasFetchedData.current = true;
//     }
//   },[]);

//   const columnsAttd = [
//     { key: "tracking_date", title: "Date" },
//     { key: "tracking_day", title: "Day" },
//     { key: "employee_name", title: "Employee" },
//     { key: "checkin_time", title: "Time In" },
//     { key: "Check in Location", title: "Check In Location" },
//     { key: "checkout_time", title: "Time Out" },
//     { key: "Check out Location", title: "Check Out Location" },
//     { key: "total_minutes", title: "Total Hours" },
//   ];

//   const modalColumns = [
//     { group: "Basic Info", key: "attendance_id", title: "ID" },
//     { group: "Basic Info", key: "tracking_date", title: "Date &  Day" },
//     { group: "Basic Info", key: "employee_name", title: "Employee Name" },

//     { group: "Check In Info", key: "checkin_time", title: "Chx in time" },
//     { group: "Check In Info", key: "Check in Location", title: "Chx in Location" },
//     { group: "Map Info", key: "checkin_latitude", title: "Chx in  Map" },

//     { group: "Check Out Info", key: "checkout_time", title: "Chx out time" },
//     { group: "Check Out Info", key: "Check out Location", title: "Chx out Location" },
//     { group: "Map Info", key: "checkout_latitude", title: "Chx out Map" },
//   ];
//   return (
//     <Tables
//       columns={columnsAttd}
//       modalTitle="Detail Attendance Info"
//       modalColumns={modalColumns}
//       data={attendanceList}
//       filterKeys={["Check in Location", "Check out Location"]}
//       idParam="attendance_id"
//       infoEndpoint="/api/admin/attendance"
//     />
//   );
// }

// //v1.2 gemini
// import { useEffect, useState, useRef } from "react";
// import Tables from "@/components/Tables";

// export default function AttendanceList() {
//   const [attendanceList, setAttendanceList] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const hasFetchedData = useRef(false);

//   const fetchdata = async () => {
//     try {
//       const res = await fetch("/api/admin/attendance");
//       if (!res.ok) throw new Error("Failed to fetch attendance list");

//       const data = await res.json();
//       setAttendanceList(data.listAttendance);
//     } catch (err) {
//       setError("Error fetching data");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (!hasFetchedData.current) {
//       fetchdata();
//       hasFetchedData.current = true;
//     }
//   }, []);

//   // --- NEW GENERIC FORMATTING FUNCTION ---
//   // This function takes an ISO string (which we created in the backend)
//   // and formats it into the user's local timezone.
//   const formatDateTime = (
//     isoString: string | null | undefined,
//     options: Intl.DateTimeFormatOptions,
//   ) => {
//     if (!isoString) return "No time recorded";

//     try {
//       // The Date constructor automatically parses the ISO string and converts it to the user's local time.
//       const date = new Date(isoString);
//       // We check if the date is valid.
//       if (isNaN(date.getTime())) return "Invalid Date";
//       // Intl.DateTimeFormat is a powerful way to format dates and times for different languages.
//       return new Intl.DateTimeFormat(undefined, options).format(date);
//     } catch (e) {
//       console.error("Error formatting date:", e);
//       return "Error";
//     }
//   };

//   // --- UPDATED COLUMN DEFINITIONS ---
//   // Note: We're assuming your `Tables` component's render prop provides the entire row object.
//   // This allows us to create a "Date" column using data from either check-in or check-out.
//   const columnsAttd = [
//     {
//       key: "tracking_date",
//       title: "Date",
//       render: (_: any, record: any) =>
//         formatDateTime(record.checkinISO || record.checkoutISO, {
//           year: "numeric",
//           month: "long",
//           day: "numeric",
//         }),
//     },
//     {
//       key: "tracking_day",
//       title: "Day",
//       render: (_: any, record: any) =>
//         formatDateTime(record.checkinISO || record.checkoutISO, {
//           weekday: "long",
//         }),
//     },
//     { key: "employee_name", title: "Employee" },
//     {
//       key: "checkin_time",
//       title: "Time In",
//       render: (_: any, record: any) =>
//         formatDateTime(record.checkinISO, {
//           hour: "2-digit",
//           minute: "2-digit",
//           second: "2-digit",
//         }),
//     },
//     { key: "Check in Location", title: "Check In Location" },
//     {
//       key: "checkout_time",
//       title: "Time Out",
//       render: (_: any, record: any) =>
//         formatDateTime(record.checkoutISO, {
//           hour: "2-digit",
//           minute: "2-digit",
//           second: "2-digit",
//         }),
//     },
//     { key: "Check out Location", title: "Check Out Location" },
//     { key: "total_minutes", title: "Total Hours" },
//   ];

//   const modalColumns = [
//     { group: "Basic Info", key: "attendance_id", title: "ID" },
//     {
//       group: "Basic Info",
//       key: "tracking_date",
//       title: "Date & Day",
//       render: (_: any, record: any) =>
//         formatDateTime(record.checkinISO || record.checkoutISO, {
//           weekday: "long",
//           year: "numeric",
//           month: "long",
//           day: "numeric",
//         }),
//     },
//     { group: "Basic Info", key: "employee_name", title: "Employee Name" },

//     {
//       group: "Check In Info",
//       key: "checkin_time",
//       title: "Check in time",
//       render: (_: any, record: any) =>
//         formatDateTime(record.checkinISO, {
//           hour: "numeric",
//           minute: "2-digit",
//           second: "2-digit",
//         }),
//     },
//     {
//       group: "Check In Info",
//       key: "Check in Location",
//       title: "Check in Location",
//     },
//     { group: "Map Info", key: "checkin_latitude", title: "Check in Map" },

//     {
//       group: "Check Out Info",
//       key: "checkout_time",
//       title: "Check out time",
//       render: (_: any, record: any) =>
//         formatDateTime(record.checkoutISO, {
//           hour: "numeric",
//           minute: "2-digit",
//           second: "2-digit",
//         }),
//     },
//     {
//       group: "Check Out Info",
//       key: "Check out Location",
//       title: "Check out Location",
//     },
//     { group: "Map Info", key: "checkout_latitude", title: "Check out Map" },
//   ];
//   return (
//     <Tables
//       columns={columnsAttd}
//       modalTitle="Detail Attendance Info"
//       modalColumns={modalColumns}
//       data={attendanceList}
//       filterKeys={["Check in Location", "Check out Location"]}
//       idParam="attendance_id"
//       infoEndpoint="/api/admin/attendance"
//     />
//   );
// }

//v1.3 gemini
import { useEffect, useState, useRef } from "react";
import Tables from "@/components/Tables";

export default function AttendanceList() {
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);
  const [currentPage, setCurrentPage] = useState(1);

  // This helper function remains the same. It correctly parses ISO strings.
  const formatDateTime = (
    isoString: string | null | undefined,
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

  const fetchdata = async () => {
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
      // --- END OF NEW LOGIC ---
    } catch (err) {
      setError("Error fetching data");
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
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // --- UPDATED COLUMNS ---
  // The 'key' now points to our new, pre-formatted display properties.
  // We no longer need the 'render' function for the main table.
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

  // The modal might still use render props, so we can keep them here.
  // This gives you flexibility if the modal renderer works differently.
  const modalColumns = [
    { group: "Basic Info", key: "attendance_id", title: "ID" },
    {
      group: "Basic Info",
      key: "tracking_date",
      title: "Date &  Day",
      // We can use a render prop here for the modal if needed
      // render: (_: any, record: any) =>
      //   `${record.displayDay}, ${record.displayDate}`,
      render: (_: any, record: any) => {
        const date = formatDateTime(record.checkinISO || record.checkoutISO, {
          year: "numeric",
          month: "numeric",
          day: "numeric",
        });
        const day = formatDateTime(record.checkinISO || record.checkoutISO, {
          weekday: "long",
        });
        return `${date}, ${day}`;
      },
    },
    { group: "Basic Info", key: "employee_name", title: "Employee Name" },

    {
      group: "Check In Info",
      key: "checkin_time",
      title: "Time In",
      // render: (_: any, record: any) => record.displayCheckin,
      render: (_: any, record: any) =>
        formatDateTime(record.checkinISO, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
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
      key: "checkout_time",
      title: "Time Out",
      render: (_: any, record: any) => record.displayCheckout,
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
