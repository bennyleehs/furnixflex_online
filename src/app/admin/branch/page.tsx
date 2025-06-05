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
// const SUBMENUS = ["0", "1"];
const PERMISSION_PREFIX = `${MENU}.${SUBMENU}`;

export default function BranchPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);
  const { canCreate, loadingPermissions } = usePermissions(); // Use the custom hook
  const canCreateButton = canCreate(MENU, SUBMENU);
  // const { canCreate, loadingPermissions, permissions } = usePermissions();
  // const canCreateButton =
  //   !loadingPermissions && SUBMENUS.some((sub) => canCreate(MENU, sub));
  // console.log("USER PERMISSIONS:", permissions);
  // console.log("canCreate('1', '0') =", canCreate("1", "0"));
  // console.log("canCreate('1', '1') =", canCreate("1", "1"));
  // console.log("canCreateButton =", canCreateButton);
  // const PERMISSION_PREFIX = `${MENU}.0`;

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/branch");
      if (!res.ok) throw new Error("Failed to fetch branches");

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
    } catch (err) {
      setError("Error fetching data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasFetchedData.current) {
      fetchData();
      hasFetchedData.current = true;
    }
  }, [canCreateButton, loadingPermissions]);

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
    </DefaultLayout>
  );
}
