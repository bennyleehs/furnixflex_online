// src/app/admin/scopes_access/update/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export default function UpdateScopesAccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const keyParam = searchParams.get("id"); // Get the key from the URL parameter
  
  const [key, setKey] = useState<string>(keyParam || "");
  const [branch, setBranch] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [accessPaths, setAccessPaths] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [allMenuItemIds, setAllMenuItemIds] = useState<string[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch menu items for checkboxes
        const menuRes = await fetch("/api/admin/menu_items");
        const menuData = await menuRes.json();
        
        // Process menu items into a flat map and get all IDs
        const menuMap: Record<string, string> = {};
        const allIds: string[] = [];
        
        const processMenuItems = (items: any[], parentPath = "") => {
          items.forEach((item) => {
            const label = `${parentPath}${parentPath ? " > " : ""}${item.label}`;
            menuMap[item.id] = label;
            allIds.push(item.id);
            
            if (item.children?.length) {
              processMenuItems(item.children, label);
            }
          });
        };
        
        menuData.forEach((section: any) => {
          processMenuItems(section.menuItems);
        });
        
        setMenuItems(menuMap);
        setAllMenuItemIds(allIds);
        
        // If key param exists, fetch current access paths
        if (keyParam) {
          const accessRes = await fetch("/api/admin/scopes_access/access_path");
          const accessData = await accessRes.json();
          
          // Find the matching key (case-insensitive)
          const normalizedKeyParam = keyParam.toUpperCase();
          let foundKey = "";
          let foundPaths: string[] = [];
          
          Object.entries(accessData).forEach(([originalKey, paths]) => {
            if (originalKey.toUpperCase() === normalizedKeyParam) {
              foundKey = originalKey;
              foundPaths = paths as string[];
              
              // Extract branch, department, role from the key
              const [branchVal, departmentVal, roleVal] = originalKey.split(".");
              setBranch(branchVal);
              setDepartment(departmentVal);
              setRole(roleVal);
            }
          });
          
          if (foundKey) {
            setKey(foundKey);
            setAccessPaths(foundPaths);
          } else {
            setError("Access path not found for the specified key");
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [keyParam]);
  
  const handleCheckboxChange = (menuId: string) => {
    setAccessPaths((prev) => {
      if (prev.includes(menuId)) {
        return prev.filter(id => id !== menuId);
      } else {
        return [...prev, menuId];
      }
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch("/api/admin/scopes_access/access_path", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key,
          accessPath: accessPaths,
        }),
      });
      
      if (response.ok) {
        setSuccess("Access paths updated successfully!");
        setTimeout(() => {
          router.push('/admin/scopes_access');
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update access paths");
      }
    } catch (err) {
      console.error("Error updating access paths:", err);
      setError("An error occurred while updating access paths");
    }
  };
  
  if (loading) {
    return (
      <DefaultLayout>
        <Breadcrumb pageName="Update Access Paths" />
        <div className="p-4">Loading...</div>
      </DefaultLayout>
    );
  }
  
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Update Access Paths" />
      
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
          <h3 className="font-medium text-black dark:text-white">
            Update Access Paths
          </h3>
        </div>
        
        {error && (
          <div className="mb-4 px-6.5 pt-4">
            <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/30">
              <div className="flex">
                <div className="text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {success && (
          <div className="mb-4 px-6.5 pt-4">
            <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/30">
              <div className="flex">
                <div className="text-sm text-green-700 dark:text-green-400">
                  {success}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="p-6.5">
            <div className="mb-4.5">
              <div className="w-full xl:w-1/2">
                <label className="mb-2.5 block text-black dark:text-white">
                  Key
                </label>
                <input
                  type="text"
                  value={`${branch}.${department}.${role}`}
                  disabled
                  className="w-full rounded border-[1.5px] border-stroke bg-gray py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label className="mb-2.5 block text-black dark:text-white">
                Access Paths
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allMenuItemIds.map((id) => (
                  <div key={id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`menu-${id}`}
                      checked={accessPaths.includes(id)}
                      onChange={() => handleCheckboxChange(id)}
                      className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:border-strokedark dark:bg-form-input"
                    />
                    <label
                      htmlFor={`menu-${id}`}
                      className="ml-2 text-sm font-medium text-black dark:text-white"
                    >
                      {id} - {menuItems[id] || "Unknown menu item"}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-4.5">
              <button
                type="button"
                onClick={() => router.push('/admin/scopes_access')}
                className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </DefaultLayout>
  );
}