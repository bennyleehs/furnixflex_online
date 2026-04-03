"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import FormBranch from "@/components/FormElements/FormBranch";
// import FormBranch from "@/components/FormElements/FormUni";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Column } from '@/types/form';
import countriesData from "@/../public/data/countries.json";

interface LocalCountry {
  name: string;
  idd: string;
  time_zone: string;
  currency_name: string;
  currency: string;
  currency_symbol: string;
  states: { name: string; cities: string[] }[];
}

export default function BranchPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);
  const searchParams = useSearchParams();
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [sidebarCountryName, setSidebarCountryName] = useState("");
  const [matchedCountry, setMatchedCountry] = useState<LocalCountry | undefined>(undefined);

  // Load country from sidebar menu API
  useEffect(() => {
    const loadMenu = async () => {
      try {
        const res = await fetch("/api/admin/menu_items");
        if (res.ok) {
          const menuData = await res.json();
          const countryName = menuData[0]?.name || "";
          setSidebarCountryName(countryName);
          setMatchedCountry(
            (countriesData.countries as LocalCountry[]).find((c) => c.name === countryName)
          );
        }
      } catch (err) {
        console.error("Failed to load menu:", err);
      }
    };
    loadMenu();
  }, []);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id && !hasFetchedData.current) {
      async function fetchData() {
        try {
          const res = await fetch(`/api/admin/branch?id=${id}`);
          if (!res.ok) throw new Error("Failed to fetch branch data");
          const data = await res.json();
          setData([data]);
        } catch (err) {
          setError("Error fetching branch data");
          console.error(err);
        }
      }
      fetchData();
      hasFetchedData.current = true;
    }
  }, [searchParams]);

  const columns: Column[] = [
    { 
      title: "Country", 
      inputType: "text", 
      valueKey: "country",
      defaultValue: sidebarCountryName,
      readOnly: true,
    },
    { title: "Time Zone", inputType: "text", valueKey: "time_zone", defaultValue: matchedCountry?.time_zone || "" },
    { title: "Currency Code", inputType: "text", valueKey: "currencies_code", defaultValue: matchedCountry?.currency || "" },
    { title: "Currency Symbol", inputType: "text", valueKey: "currencies_symbol", defaultValue: matchedCountry?.currency_symbol || "" },
    { title: "IDD", inputType: "text", valueKey: "idd", defaultValue: matchedCountry?.idd || "", readOnly: true },
    { title: "Name", inputType: "text", valueKey: "name" },
    { title: "REF", inputType: "text", valueKey: "ref" },
    { title: "Phone", inputType: "text", valueKey: "phone" },
    { title: "Email", inputType: "text", valueKey: "email" },
    { title: "Address Line 1", inputType: "text", valueKey: "address_line1" },
    { title: "Address Line 2", inputType: "text", valueKey: "address_line2" },
    { title: "Postcode", inputType: "text", valueKey: "postcode" },
    { title: "City", inputType: "text", valueKey: "city" },
    { title: "State", inputType: "text", valueKey: "state" },
    { title: "Company Name", inputType: "text", valueKey: "company_name" },
    { title: "Registration No.", inputType: "text", valueKey: "company_reg" },
    { title: "Bank", inputType: "text", valueKey: "bank_name" },
    { title: "Account", inputType: "text", valueKey: "bank_account" },
    { title: "Swift", inputType: "text", valueKey: "bank_swift" },
    { title: "Status", inputType: "select", valueKey: "status",
        options: [
        { id: "Active", value: "Active", label: "Active" },
        { id: "Inactive", value: "Inactive", label: "Inactive" },
        { id: "Pending", value: "Pending", label: "Pending" },
        { id: "History", value: "History", label: "History" }
        ] 
    },
  ];

  return (
    <DefaultLayout>
      <Breadcrumb 
        pageName={data.length ? `Edit Branch (${data[0]?.id || "N/A"})` : "New Branch"} 
      />
      <FormBranch
        columns={columns}
        data={data} // Pass the fetched data
        loading={loading}
        submitUrl="/api/admin/branch/create"
        redirectUrl="/admin/branch"
      />
    </DefaultLayout>
  );
}
