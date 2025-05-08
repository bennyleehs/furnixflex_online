"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Form from "@/components/FormElements/FormUni";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";

// Enhanced Column interface
interface Column {
  title: string;
  inputType?: string;
  valueKey: string;
  options?: OptionItem[];
  dependencies?: string[];
  transform?: (value: any, allValues: Record<string, any>, options?: any[]) => any;
  readOnly?: boolean;
  required?: boolean;
  defaultValue?: string;
}

// Enhanced option interface
interface OptionItem {
  value: string;
  label: string;
  meta?: Record<string, any>;
}

// Countries data interface
interface CountryData {
  name: string;
  states: StateData[];
}

interface StateData {
  name: string;
  cities: string[];
}

export default function Page() {
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);
  const fetchingRef = useRef(false); // Move this to component level
  const searchParams = useSearchParams();
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [salesReps, setSalesReps] = useState<any[]>([]);

  // Flag to track whether we're in edit mode
  const isEditMode = Boolean(searchParams.get("id"));

  // Fetch pre-required data
  useEffect(() => {
    async function fetchPreData() {
      // If already fetching, don't start another fetch operation
      if (fetchingRef.current) return;
      
      try {
        fetchingRef.current = true;
        
        // Fetch countries data
        const countriesResponse = await fetch("/data/countries.json");
        if (!countriesResponse.ok) {
          throw new Error(`Failed to fetch countries: ${countriesResponse.status}`);
        }
        
        const countriesData = await countriesResponse.json();
        // console.log("Countries data loaded:", countriesData);
        
        if (countriesData && Array.isArray(countriesData.countries)) {
          setCountries(countriesData.countries);
        } else {
          console.error("Countries data is not in the expected format:", countriesData);
        }

        // Fetch sales representatives data
        const salesResponse = await fetch("/api/sales/lead/salesStaff");
        if (!salesResponse.ok) {
          throw new Error(`Failed to fetch sales representatives: ${salesResponse.status}`);
        }
        
        const salesData = await salesResponse.json();
        // console.log("Sales representatives loaded:", salesData);
        
        if (salesData && Array.isArray(salesData.employees)) {
          setSalesReps(salesData.employees);
        } else {
          console.error("Sales data is not in the expected format:", salesData);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        fetchingRef.current = false;
      }
    }
    
    fetchPreData();
  }, []);

  // Create option getter functions
  const getCountryOptions = () => {
    if (countries.length === 0) {
      return [{ value: "", label: "Loading countries..." }];
    }
    
    return countries.map(country => ({
      value: country.name,
      label: country.name
    }));
  };
  
  const getStateOptions = () => {
    if (!formData.country || countries.length === 0) {
      return [{ value: "", label: "Select country first" }];
    }
    
    const country = countries.find(c => c.name === formData.country);
    if (!country) {
      return [{ value: "", label: "No states found" }];
    }
    
    return country.states.map(state => ({
      value: state.name,
      label: state.name
    }));
  };
  
  const getCityOptions = () => {
    if (!formData.country || !formData.state || countries.length === 0) {
      return [{ value: "", label: "Select state first" }];
    }
    
    const country = countries.find(c => c.name === formData.country);
    if (!country) {
      return [{ value: "", label: "No cities found" }];
    }
    
    const state = country.states.find(s => s.name === formData.state);
    if (!state) {
      return [{ value: "", label: "No cities found" }];
    }
    
    return state.cities.map(city => ({
      value: city,
      label: city
    }));
  };

  // Fetch lead data
  useEffect(() => {
    const id = searchParams.get("id");

    async function fetchData() {
      try {
        if (id) {
          const response = await fetch(`/api/sales/lead?id=${id}`);
          if (!response.ok) {
            throw new Error("Failed to fetch lead data");
          }
          
          const responseData = await response.json();
          
          if (responseData.listLead && responseData.listLead.length > 0) {
          // console.log("Lead data loaded:", [responseData.listLead[0]]);
          setData([responseData.listLead[0]]);
          } else {
            throw new Error("No lead data found");
          }
        }
      } catch (err) {
        console.error("Error fetching lead data:", err);
        setError("Failed to load lead data. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (!hasFetchedData.current) {
      fetchData();
      hasFetchedData.current = true;
    }
  }, [searchParams]);

  const column: Column[] = [
      {
        title: "Source",
        inputType: "select",
        valueKey: "source",
        options: [
          { value: "FB", label: "FB" },
          { value: "TicTok", label: "TicTok" },
          { value: "小红书", label: "小红书" },
          { value: "Website", label: "Website" },
          { value: "Walk-in", label: "Walk-in" },
          { value: "Referral", label: "Referral" },
          { value: "Dealer", label: "Dealer" },
          { value: "Other", label: "Other" },
        ],
      },
      {
        title: "Insterested",
        inputType: "select",
        valueKey: "interested",
        options: [
          { value: "Package", label: "Package" },
          { value: "Non-package", label: "Non-package" },
          { value: "Accessory", label: "Accessory" },
          { value: "Other", label: "Other" },
        ],
      },
      { 
        title: "Additional Information", inputType: "text", valueKey: "add_info" 
      },
      { 
        title: "Name", inputType: "text", valueKey: "name", required: true,
      },
      { 
        title: "NRIC", inputType: "text", valueKey: "nric",
      },
      { 
        title: "Primary Phone", inputType: "text", valueKey: "phone1", required: true,
      },
      { 
        title: "Secondary Phone", inputType: "text", valueKey: "phone2",
      },
      { 
        title: "Email", inputType: "email", valueKey: "email",
      },
      { 
        title: "Address Line 1", inputType: "text", valueKey: "address_line1", required: true,
      },
      { 
        title: "Address Line 2", inputType: "text", valueKey: "address_line2",
      },
      { 
        title: "Postcode", inputType: "text", valueKey: "postcode",
      },
      {
        title: "Property Type",
        inputType: "select",
        valueKey: "property",
        defaultValue: "High-Rise",
        options: [
          { value: "Landed", label: "Landed" },
          { value: "High-Rise", label: "High-Rise" },
        ],
      },
      {
        title: "Gated Guarded",
        inputType: "select",
        valueKey: "guard",
        defaultValue: "Guarded",
        options: [
          { value: "Guarded", label: "Guarded" },
          { value: "No-Guard", label: "No-Guard" },
        ],
      },
      { 
        title: "Country",
        inputType: "select",
        valueKey: "country",
        // defaultValue: "Malaysia",
        options: getCountryOptions(), // Use the country options function
      },
      { 
        title: "State", 
        inputType: "select", 
        valueKey: "state",
        options: getStateOptions(), // Use the state options function
      },
      { 
        title: "City", 
        inputType: "select",
        valueKey: "city",
        options: getCityOptions(), // Use the city options function
      },
      {
        title: "Status",
        inputType: "select",
        valueKey: "status",
        required: true,
        defaultValue: "Assign PIC",
        options: [
          { value: "Assign PIC", label: "Assign PIC" },
          { value: "Follow Up", label: "Follow UP" },
          { value: "Visit Showroom", label: "Visit Showroom" },
          { value: "Quotation", label: "Quotation" },
          { value: "Deposit", label: "Deposit" },
          { value: "Production", label: "Production" },
          { value: "Installation", label: "Installation" },
          { value: "Job Done", label: "Job Done" },
          { value: "Over Budget", label: "Over Budget" },
          { value: "Others Design", label: "Others Design" },
          { value: "Drop Interest", label: "Drop Interest" },
        ],
      },
      {
        title: "Sales Representative",
        inputType: "select",
        valueKey: "sales_id",
        defaultValue: "0", // Add this line to set default value
        transform: (value: string, allValues: Record<string, any>) => {
          // When a valid sales representative is selected (not empty)
          if (value && value !== "") {
            // Return object to update status to "Follow Up"
            return {
              status: "Follow Up"
            };
          }
          return {}; // No changes if no rep selected
        },
        options: salesReps.map(rep => ({ 
          value: rep.id, 
          label: `${rep.uid} ${rep.name} (${rep.task_count || 0})` 
        })) || [{ value: "", label: "Loading sales representatives..." }],
     },
    ];

  return (
    <DefaultLayout>
      <Breadcrumb
        pageName={isEditMode ? `Edit Lead (${data[0]?.id || "N/A"})` : "New Lead"}
      />
      <Form
        columns={column}
        data={data}
        formData={formData}
        setFormData={setFormData}
        loading={loading}
        submitUrl="/api/sales/lead/create"
        redirectUrl="/sales/lead"
      />
    </DefaultLayout>
  );
};
