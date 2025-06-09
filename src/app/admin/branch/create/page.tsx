"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import FormBranch from "@/components/FormElements/FormBranch";
// import FormBranch from "@/components/FormElements/FormUni";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Column } from '@/types/form';

interface Country {
  name: {
    common: string;
    official: string;
    nativeName: Record<string, { official: string; common: string; }>;
  };
  idd: {
    root: string;
    suffixes: string[];
  };
  timezones: string[];
  currencies: Record<string, {
    name: string;
    symbol: string;
  }>;
}

// First, define the allowed countries
const ALLOWED_COUNTRIES = ['malaysia', 'indonesia', 'philippines'];

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
        setLoading(true);
        // Create an array of promises for each country fetch
        const promises = ALLOWED_COUNTRIES.map(country =>
          fetch(`https://restcountries.com/v3.1/name/${country}`)
            .then(res => res.json())
            .then(data => data[0]) // Take first result since API returns array
        );

        // Wait for all promises to resolve
        const countriesData = await Promise.all(promises);
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
        id: country.name.common,
        value: country.name.common,
        label: country.name.common,
        idd: country.idd?.root ? `${country.idd.root}${country.idd.suffixes?.[0] || ''}` : '',
        timezones: country.timezones,
        currencies_code: Object.keys(country.currencies || {})[0] || '',
        currencies_symbol: Object.values(country.currencies || {})[0]?.symbol || ''
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
