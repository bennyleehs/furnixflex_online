// src/app/admin/branch/page.tsx
"use client";
import { useEffect, useState, useRef } from "react";
import Tables from "@/components/Tables";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import usePermissions from "@/hooks/usePermissions";

const title = "Branch";
const MENU = "1";
const SUBMENU = "1";
const PERMISSION_PREFIX = `${MENU}.${SUBMENU}`;

export default function BranchPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);
  const { canCreate, loadingPermissions } = usePermissions();
  const canCreateButton = canCreate(MENU, SUBMENU);

  const fetchData = async () => {
    setLoading(true); // Always set loading to true at the start
    setError(null);   // Clear any previous errors

    try {
      const res = await fetch("/api/admin/branch");

      if (!res.ok) {
        // --- Explicitly handle non-2xx HTTP responses here ---
        const errorResponse = await res.json().catch(() => ({})); // Attempt to parse JSON, gracefully handle if not JSON

        let errorMessageToShow = "An unexpected error occurred while fetching data."; // Default fallback message

        if (res.status === 403) {
          errorMessageToShow = "You do not have permission to access this resource.";
        } else if (res.status === 401) {
          errorMessageToShow = errorResponse.error || "Authentication required or session expired. Please log in.";
        } else {
          errorMessageToShow = errorResponse.error || `Failed to fetch data: HTTP Status ${res.status}`;
        }

        setError(errorMessageToShow); // Set the specific error message
        setLoading(false);           // Stop loading if an error occurred
        return;                      // IMPORTANT: Exit the function after handling the error
      }

      // If res.ok is true (status 200), proceed with success logic
      const data = await res.json();
      const formattedRows = data.listBranch.map((branch: any) => ({
        ...branch,
        name: `${branch.name} / ${branch.ref}`,
        contact: `${branch.idd} / ${branch.phone} / ${branch.email}`,
        address: `${branch.address_line1}, ${branch.address_line2}, ${branch.city}, ${branch.state}, ${branch.country}`,
        country: branch.country,
        company: `${branch.company_name} / ${branch.company_reg}`,
        bank: `${branch.bank_name} / ${branch.bank_account} / ${branch.bank_swift}`,
        time_zone: `${branch.time_zone} / ${branch.currencies_code} (${branch.currencies_symbol})`,
      }));
      setBranches(formattedRows);

    } catch (err: any) {
      // This catch block will only execute for:
      // 1. True network errors (e.g., server unreachable, DNS error, CORS issues preventing response)
      // 2. Severe parsing errors if res.json() fails in a way not caught by `.catch(() => ({}))`
      setError("Network error: Could not connect to the server or process response.");
      console.error("Fetch error:", err);
    } finally {
      // Ensure loading is always set to false, handling both success and error paths
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if permissions are loaded and data hasn't been fetched yet
    if (!loadingPermissions && !hasFetchedData.current) {
      fetchData();
      hasFetchedData.current = true;
    }
  }, [loadingPermissions]);

  const columns = [
    { key: "id", title: "ID" },
    { key: "name", title: "Name / REF" },
    { key: "contact", title: "Contact" },
    { key: "address", title: "Address" },
    { key: "company", title: "Company / REG" },
    { key: "bank", title: "Bank / Account / Swift" },
    { key: "time_zone", title: "Time / Currencies" },
    { key: "status", title: "Status" },
  ];

  return (
    <DefaultLayout>
      <Breadcrumb pageName={title} />
      {loading && <p>Loading Branches...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && (
        <Tables
          columns={columns}
          data={branches}
          createLink="/admin/branch/create"
          filterKeys={["country", "status"]}
          showCreateButton={!loadingPermissions && canCreateButton}
          createPermissionPrefix={PERMISSION_PREFIX}
          editPermissionPrefix={PERMISSION_PREFIX}
          deletePermissionPrefix={PERMISSION_PREFIX}
          monitorPermissionPrefix={PERMISSION_PREFIX}
        />
      )}
    </DefaultLayout>
  );
}