"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCurrentLocation,
  getDeviceInfo,
  type LocationData,
  type DeviceInfo,
} from "@/lib/location";

interface AttendanceRecord {
  id: number;
  employee_id: string;
  employee_name: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  total_hours: number;
  status: string;
  check_in_address: string | null;
  check_out_address: string | null;
  is_location_verified: boolean;
  is_office_location: boolean;
}

interface AttendanceTrackerProps {
  employeeId: string;
  employeeName: string;
}

export default function AttendanceTracker({
  employeeId,
  employeeName,
}: AttendanceTrackerProps) {
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] =
    useState<string>("prompt");
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(
    null,
  );

  const checkLocationPermission = async () => {
    if ("permissions" in navigator) {
      try {
        const permission = await navigator.permissions.query({
          name: "geolocation",
        });
        setLocationPermission(permission.state);

        permission.onchange = () => {
          setLocationPermission(permission.state);
        };
      } catch (error) {
        console.error("Error checking location permission:", error);
      }
    }
  };

  const fetchTodayAttendance = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/attendance/today?employee_id=${employeeId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setTodayRecord(data.record);
      }
    } catch (error) {
      console.error("Error fetching today attendance:", error);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchTodayAttendance();
    checkLocationPermission();
  }, [employeeId, fetchTodayAttendance]);

  const getLocationAndDeviceInfo = async (): Promise<{
    location: LocationData | null;
    device: DeviceInfo;
  }> => {
    const device = getDeviceInfo();
    let location: LocationData | null = null;

    if (locationPermission === "granted" || locationPermission === "prompt") {
      try {
        location = await getCurrentLocation();
        setCurrentLocation(location);
      } catch (error) {
        console.error("Error getting location:", error);
        // Continue without location if user denies or error occurs
      }
    }

    return { location, device };
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const { location, device } = await getLocationAndDeviceInfo();

      const response = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_id: employeeId,
          employee_name: employeeName,
          latitude: location?.latitude,
          longitude: location?.longitude,
          accuracy: location?.accuracy,
          device_info: device,
          session_id:
            sessionStorage.getItem("session_id") || crypto.randomUUID(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTodayRecord(data.record);
        alert("Check-in successful!");
      } else {
        alert(data.error || "Check-in failed");
      }
    } catch (error) {
      console.error("Error during check-in:", error);
      alert("Check-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const { location, device } = await getLocationAndDeviceInfo();

      const response = await fetch("/api/attendance/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_id: employeeId,
          latitude: location?.latitude,
          longitude: location?.longitude,
          accuracy: location?.accuracy,
          device_info: device,
          session_id: sessionStorage.getItem("session_id"),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTodayRecord(data.record);
        alert(`Check-out successful! Total hours: ${data.total_hours}`);
      } else {
        alert(data.error || "Check-out failed");
      }
    } catch (error) {
      console.error("Error during check-out:", error);
      alert("Check-out failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string | null | undefined) => {
    if (!timeString) return "Not recorded";
    return new Date(timeString).toLocaleTimeString();
  };

  return (
    <div className="dark:bg-boxdark border-stroke dark:border-strokedark shadow-default rounded-sm border bg-white p-6">
      <h3 className="mb-6 text-xl font-semibold text-black dark:text-white">
        Attendance Tracker
      </h3>

      {/* Location Status */}
      <div className="dark:bg-meta-4 mb-4 rounded-lg bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Location Status:
          </span>
          <span
            className={`rounded-full px-2 py-1 text-sm ${
              locationPermission === "granted"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : locationPermission === "denied"
                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
            }`}
          >
            {locationPermission === "granted"
              ? "Enabled"
              : locationPermission === "denied"
                ? "Disabled"
                : "Not Set"}
          </span>
        </div>
        {currentLocation && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Accuracy: ±{currentLocation.accuracy.toFixed(0)} meters
          </div>
        )}
      </div>

      {/* Today's Attendance */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <h4 className="mb-2 font-medium text-blue-900 dark:text-blue-100">
            Check In
          </h4>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatTime(todayRecord?.check_in_time)}
          </p>
          {todayRecord?.check_in_address && (
            <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
              📍 {todayRecord.check_in_address}
            </p>
          )}
        </div>

        <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
          <h4 className="mb-2 font-medium text-green-900 dark:text-green-100">
            Check Out
          </h4>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatTime(todayRecord?.check_out_time)}
          </p>
          {todayRecord?.check_out_address && (
            <p className="mt-1 text-xs text-green-600 dark:text-green-400">
              📍 {todayRecord.check_out_address}
            </p>
          )}
        </div>
      </div>

      {/* Total Hours */}
      {todayRecord?.total_hours && (
        <div className="mb-6 rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
          <h4 className="mb-2 font-medium text-purple-900 dark:text-purple-100">
            Total Hours
          </h4>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {todayRecord.total_hours.toFixed(2)} hours
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleCheckIn}
          disabled={loading || !!todayRecord?.check_in_time}
          className={`flex-1 rounded-lg px-4 py-3 font-medium transition-colors ${
            todayRecord?.check_in_time
              ? "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {loading
            ? "Processing..."
            : todayRecord?.check_in_time
              ? "Already Checked In"
              : "Check In"}
        </button>

        <button
          onClick={handleCheckOut}
          disabled={
            loading ||
            !todayRecord?.check_in_time ||
            !!todayRecord?.check_out_time
          }
          className={`flex-1 rounded-lg px-4 py-3 font-medium transition-colors ${
            !todayRecord?.check_in_time || todayRecord?.check_out_time
              ? "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {loading
            ? "Processing..."
            : !todayRecord?.check_in_time
              ? "Check In First"
              : todayRecord?.check_out_time
                ? "Already Checked Out"
                : "Check Out"}
        </button>
      </div>

      {/* Verification Status */}
      {todayRecord && (
        <div className="mt-4 flex justify-between text-sm">
          <span
            className={`rounded-full px-2 py-1 ${
              todayRecord.is_location_verified
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            }`}
          >
            {todayRecord.is_location_verified
              ? "✓ Location Verified"
              : "✗ Location Not Verified"}
          </span>

          {todayRecord.is_location_verified && (
            <span
              className={`rounded-full px-2 py-1 ${
                todayRecord.is_office_location
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
              }`}
            >
              {todayRecord.is_office_location
                ? "🏢 Office Location"
                : "🏠 Remote Location"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
