"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCurrentLocation,
  getDeviceInfo,
  type LocationData,
  type DeviceInfo,
} from "@/lib/location";
import { useAuth } from "@/context/AuthContext";

interface AttendanceRecord {
  id: number;
  user_id: string;
  tracking_date: string;
  tracking_day: string;
  checkin_time: string | null;
  checkout_time: string | null;
  checkin_address: string | null;
  checkout_address: string | null;
  checkin_latitude: number | null;
  checkin_longitude: number | null;
  checkout_latitude: number | null;
  checkout_longitude: number | null;
  total_minutes: number | null;
}

export default function AttendanceTracker() {
  const { user } = useAuth();
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const uid = user?.uid;
  const userName = user?.name;

  const fetchTodayRecord = useCallback(async () => {
    if (!uid) {
      setInitialLoading(false);
      return;
    }
    try {
      setInitialLoading(true);
      const res = await fetch(`/api/admin/attendance/status?uid=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setTodayRecord(data.record || null);
      } else {
        setTodayRecord(null);
      }
    } catch (err) {
      console.error("Failed to fetch today's record:", err);
      setError("Failed to fetch attendance status.");
    } finally {
      setInitialLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    fetchTodayRecord();
  }, [fetchTodayRecord]);

  const handleCheckIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const locationData = await getCurrentLocation();
      setCurrentLocation(locationData);
      const deviceInfo = getDeviceInfo();

      const response = await fetch("/api/admin/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: uid,
          user_name: userName,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          device_info: deviceInfo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Specifically handle the case where the user is already checked in.
        // Assuming your API returns a specific status, like 409 Conflict.
        // If API returns a different status for this case, adjust the check.
        if (response.status === 409) {
          // If the API confirms the user is already checked in,
          // update the state without showing an error.
          setTodayRecord(data.record || null);
          setError(null); // Clear any previous error
          // The buttons will be disabled by the updated state.
          console.log("User is already checked in. Status updated.");
        } else {
          // For any other non-OK status, treat it as an error.
          throw new Error(data.error || "Failed to check in.");
        }
      } else {
        // Handle a successful check-in
        setTodayRecord(data.record);
      }
    } catch (err: any) {
      console.error("Check-in error:", err);
      setError(err.message || "An unexpected error occurred during check-in.");
      setCurrentLocation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    setError(null);
    try {
      const locationData = await getCurrentLocation();
      setCurrentLocation(locationData);
      const deviceInfo = getDeviceInfo();

      const response = await fetch("/api/admin/attendance/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: uid,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          device_info: deviceInfo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to check out.");
      }

      const data = await response.json();
      setTodayRecord(data.record);
    } catch (err: any) {
      console.error("Check-out error:", err);
      setError(err.message || "An unexpected error occurred during check-out.");
      setCurrentLocation(null);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string | null | undefined) => {
    if (!timeString) return "No time recorded";

    const [hours, minutes, seconds] = timeString.split(":").map(Number);

    // Build a UTC date for today
    const today = new Date();
    const utcDate = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
        hours,
        minutes,
        seconds,
        0,
      ),
    );

    // Convert to user's local time automatically
    return utcDate.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const isCheckedIn = !!todayRecord?.checkin_time;
  const isCheckedOut = !!todayRecord?.checkout_time;
  const isCheckInDisabled = loading || !uid || isCheckedIn || initialLoading;
  const isCheckOutDisabled =
    loading || !uid || !isCheckedIn || isCheckedOut || initialLoading;

  if (!user) {
    return (
      <div className="rounded-lg bg-red-100 p-6 text-center text-red-700">
        Please sign in to track attendance.
      </div>
    );
  }

  return (
    <div className="dark:bg-boxdark border-stroke dark:border-strokedark shadow-default mb-6 rounded-lg border bg-white px-4 pt-4 pb-2">
      <h1 className="mb-4 text-xl font-semibold text-black dark:text-white">
        Daily Attendance
      </h1>
      {initialLoading ? (
        <div className="mb-4 rounded-lg bg-blue-100 p-4 text-center text-blue-700">
          <p>Loading attendance status...</p>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 rounded-md bg-red-100 p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Dynamic Status Message */}
          <div className="mb-4 text-center">
            {isCheckedIn ? (
              <p className="font-semibold text-green-600 dark:text-green-400">
                You are currently checked in.
              </p>
            ) : (
              <p className="font-semibold text-gray-600 dark:text-gray-400">
                Please check in to start your day.
              </p>
            )}
          </div>

          <div className="mb-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={handleCheckIn}
              disabled={isCheckInDisabled}
              className={`w-full rounded-lg px-4 py-3 font-bold text-white transition-colors sm:w-40 ${
                isCheckInDisabled
                  ? "cursor-not-allowed bg-gray-400"
                  : "bg-green-500 hover:bg-green-600"
              } `}
              //       {loading
              //         ? "Processing..."
              //         : !todayRecord?.check_in_time
              //           ? "Check In First"
              //           : todayRecord?.check_out_time
              //             ? "Already Checked Out"
              //             : "Check Out"}
            >
              {loading && !isCheckedIn ? "Processing..." : "Check In"}
            </button>
            <button
              onClick={handleCheckOut}
              disabled={isCheckOutDisabled}
              className={`w-full rounded-lg px-4 py-3 font-bold text-white transition-colors sm:w-40 ${
                isCheckOutDisabled
                  ? "cursor-not-allowed bg-gray-400"
                  : "bg-red-500 hover:bg-red-600"
              } `}
            >
              {loading && isCheckedIn ? "Processing..." : "Check Out"}
            </button>
          </div>

          {/* Display today's record */}
          {/* {todayRecord && (
          <div className="mt-6 w-full rounded-lg bg-gray-100 p-4 dark:bg-gray-700">
            <h3 className="mb-2 text-lg font-semibold">Today's Record:</h3>
            <p>
              **Check-in:** {formatTime(todayRecord.checkin_time)} (
              {todayRecord.checkin_address})
            </p>
            {todayRecord.checkout_time && (
              <p>
                **Check-out:** {formatTime(todayRecord.checkout_time)} (
                {todayRecord.checkout_address})
              </p>
            )}
            {todayRecord.total_minutes !== null && (
              <p>
                **Total Duration:** {Math.round(todayRecord.total_minutes)}{" "}
                minutes
              </p>
            )}
          </div>
        )} */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* checkin */}
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <h4 className="mb-2 font-medium text-blue-900 dark:text-blue-100">
                Check In
              </h4>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatTime(todayRecord?.checkin_time)}
              </p>
              {/* {todayRecord?.check_in_address && ( */}
              <p className="mt-1 text-sm whitespace-pre-line text-blue-600 dark:text-blue-400">
                📍 {todayRecord?.checkin_address ?? "No check-in address"}
                {todayRecord?.checkin_latitude !== null &&
                todayRecord?.checkin_latitude !== undefined &&
                todayRecord?.checkin_longitude !== null &&
                todayRecord?.checkin_longitude !== undefined
                  ? `\n[ ${todayRecord.checkin_latitude}, ${todayRecord.checkin_longitude} ]`
                  : "\n[ No data for latitude & longitude ]"}
              </p>
            </div>
            {/* checkout */}
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <h4 className="mb-2 font-medium text-blue-900 dark:text-blue-100">
                Check Out
              </h4>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatTime(todayRecord?.checkout_time)}
              </p>
              {/* {todayRecord?.check_in_address && ( */}
              <p className="mt-1 text-sm whitespace-pre-line text-blue-600 dark:text-blue-400">
                📍 {todayRecord?.checkout_address ?? "No check-out address"}
                {todayRecord?.checkout_latitude !== null &&
                todayRecord?.checkout_latitude !== undefined &&
                todayRecord?.checkout_longitude !== null &&
                todayRecord?.checkout_longitude !== undefined
                  ? `\n[ ${todayRecord.checkout_latitude}, ${todayRecord.checkout_longitude} ]`
                  : "\n[ No data for latitude & longitude ]"}
              </p>
            </div>
          </div>

          {/* Total Hours */}
          {/* v1 */}
          {/* <div className="mb-6 rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
          <h4 className="mb-2 font-medium text-purple-900 dark:text-purple-100">
            Total Hours
          </h4>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {todayRecord?.total_minutes != null
              ? `${Math.floor(todayRecord.total_minutes / 60)} hours ${todayRecord.total_minutes % 60} minutes`
              : "No record yet"}
          </p>
        </div> */}
          {todayRecord?.total_minutes && todayRecord.total_minutes > 0 && (
            <div className="mb-6 rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
              <h4 className="mb-2 font-medium text-purple-900 dark:text-purple-100">
                Total Hours
              </h4>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Math.floor(todayRecord.total_minutes / 60)} hours{" "}
                {todayRecord.total_minutes % 60} minutes
              </p>
            </div>
          )}

          {/* Developer Location Display */}
          {/* <div className="dark:bg-meta-4 mt-6 rounded-lg bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Location Status:
              </span>
              <span
                // className={`rounded-full px-2 py-1 text-sm ${
                //   locationPermission === "granted"
                //     ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                //     : locationPermission === "denied"
                //       ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                //       : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                // }`}
                className="rounded-full bg-yellow-100 px-2 py-1 text-sm text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
              >
                //comment ni nanti
                {locationPermission === "granted"
              ? "Enabled"
              : locationPermission === "denied"
                ? "Disabled"
                : "Not Set"}
                Not Set
              </span>
            </div>
            {currentLocation && (
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Accuracy: ±{currentLocation.accuracy.toFixed(0)} meters
              </div>
            )}
          </div> */}

          {/* {currentLocation && (
          <div className="mt-6 w-full rounded-lg bg-blue-100 p-4 dark:bg-blue-900">
            <h3 className="mb-2 text-lg font-semibold text-blue-800 dark:text-blue-200">
              Developer Info:
            </h3>
            <p className="text-blue-700 dark:text-blue-300">
              **Latitude:** {currentLocation.latitude}
            </p>
            <p className="text-blue-700 dark:text-blue-300">
              **Longitude:** {currentLocation.longitude}
            </p>
          </div>
        )} */}
        </>
      )}
    </div>
  );
}
