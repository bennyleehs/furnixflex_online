"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import FormBranch from "@/components/FormElements/FormBranch";
// import FormBranch from "@/components/FormElements/FormUni";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Column } from '@/types/form';

interface Country {
  name: string;
  callingCodes: string[];
  timezones: string[];
  currencies: { code: string; symbol: string }[];
}

export default function BranchPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedCountries = useRef(false);
  const hasFetchedData = useRef(false);
  const searchParams = useSearchParams();
  const [data, setData] = useState<Record<string, any>[]>([]);

  useEffect(() => {
    async function fetchCountries() {
      try {
        const res = await fetch("https://restcountries.com/v2/all");
        if (!res.ok) throw new Error("Failed to fetch countries");
        const countriesData = await res.json();
        setCountries(countriesData);
      } catch (err) {
        setError("Error fetching countries");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (!hasFetchedCountries.current) {
      fetchCountries();
      hasFetchedCountries.current = true;
    }
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
      inputType: "select", 
      valueKey: "country", 
      options: countries.map(country => ({ 
        id: country.name, // Add this line to provide required id
        value: country.name,
        label: country.name, 
        idd: country.callingCodes, 
        timezones: country.timezones,
        currencies_code: country.currencies?.[0]?.code || '',
        currencies_symbol: country.currencies?.[0]?.symbol || ''      
      })) 
    },
    { title: "Time Zone", inputType: "text", valueKey: "time_zone" },
    { title: "Currency Code", inputType: "text", valueKey: "currencies_code" },
    { title: "Currency Symbol", inputType: "text", valueKey: "currencies_symbol" },
    { title: "IDD", inputType: "text", valueKey: "idd" },
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
