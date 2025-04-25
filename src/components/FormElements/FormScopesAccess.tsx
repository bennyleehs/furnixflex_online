// scr/components/FormElements/FormScopesAccess.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect } from "react";

const FormScopesAccess = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const key = searchParams.get("key");
  
  const [accessPaths, setAccessPaths] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  // Fetch current access paths when component mounts
  useEffect(() => {
    const fetchData = async () => {
      if (!key) {
        setIsError(true);
        setMessage("No key provided");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/admin/scopes_access/access_path");
        const data = await res.json();
        
        // Find the paths for this key (case insensitive)
        const normalizedKey = key.toUpperCase();
        let foundPaths: string[] = [];
        
        // Find the original key in the data
        const originalKey = Object.keys(data).find(
          k => k.toUpperCase() === normalizedKey
        );
        
        if (originalKey && data[originalKey]) {
          foundPaths = data[originalKey];
        }
        
        setAccessPaths(foundPaths.join(","));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching access paths:", error);
        setIsError(true);
        setMessage("Failed to load access paths");
        setLoading(false);
      }
    };

    fetchData();
  }, [key]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!key) {
      setIsError(true);
      setMessage("No key provided");
      return;
    }

    setLoading(true);
    try {
      // Convert comma-separated string to array
      const pathsArray = accessPaths
        .split(",")
        .map(item => item.trim())
        .filter(item => item !== "");
      
      const response = await fetch("/api/admin/scopes_access/access_path", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key,
          accessPath: pathsArray,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to update access paths");
      }

      setIsError(false);
      setMessage("Access paths updated successfully");
      
      // Navigate back to the list after a short delay
      setTimeout(() => {
        router.push("/admin/scopes_access");
      }, 1500);
    } catch (error) {
      console.error("Error updating access paths:", error);
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Failed to update access paths");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-lg border bg-white px-5 pt-6 pb-2.5 sm:px-7.5 xl:pb-2">
      {loading ? (
        <div className="flex justify-center p-4">Loading...</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-6 grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6">
              <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                Key : Branch.Department.Role
              </label>
              <input
                type="text"
                value={key || ""}
                disabled
                className="border-primary focus:border-primary active:border-primary disabled:bg-whiter dark:bg-form-input w-full rounded-lg border-[1.5px] bg-transparent px-5 py-3 text-black outline-hidden transition disabled:cursor-default dark:text-white"
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Access Paths (comma separated IDs)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Example: 1,2,3,4"
                  className="border-stroke focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-lg border bg-transparent py-2 pr-10 pl-6 text-black outline-hidden focus-visible:shadow-none dark:text-white"
                  value={accessPaths}
                  onChange={(e) => setAccessPaths(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="mb-1 flex space-x-4">
            <input
              type="submit"
              value="UPDATE"
              className="bg-primary hover:bg-primarydark cursor-pointer rounded-lg border p-4 font-semibold text-white transition hover:text-white"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => router.push("/admin/scopes_access")}
              className="border-gray-300 bg-gray-100 hover:bg-gray-200 rounded-lg border p-4 font-semibold text-gray-700 transition"
            >
              CANCEL
            </button>
          </div>
          <div className="mt-2 text-center">
            {message && (
              <p
                className={`mt-2 ${
                  isError ? "text-center text-red-500" : "text-green-500"
                }`}
              >
                {message}
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default FormScopesAccess;