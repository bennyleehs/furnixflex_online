"use client";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Form from "@/components/FormElements/FormUni";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface Column {
  title: string;
  inputType?: string;
  valueKey: string;
  options?: OptionItem[];
  dependencies?: string[];
  transform?: (
    value: any,
    allValues: Record<string, any>,
    options?: any[],
  ) => any;
  readOnly?: boolean;
  required?: boolean;
  defaultValue?: string;
  subFields?: Column[]; // Allow composite fields
  className?: string; // Allow custom className for layout
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
  idd: string;
}

interface StateData {
  name: string;
  cities: string[];
}

export default function Page() {
  const { user } = useAuth(); //new code added
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

      const userRole = user?.role || "";
      const isSalesPerson = !["Supervisor", "Assistant Manager"].includes(
        userRole,
      );

      // use logged-in user's UID - filtering sales person
      const filterSalesUid = isSalesPerson ? user?.uid : null;

      const salesUidParam = filterSalesUid
        ? `?salesUid=${encodeURIComponent(filterSalesUid)}` //use '?' if it's the first param
        : "";

      try {
        fetchingRef.current = true;

        // Fetch countries data
        const countriesResponse = await fetch("/data/countries.json");
        if (!countriesResponse.ok) {
          throw new Error(
            `Failed to fetch countries: ${countriesResponse.status}`,
          );
        }

        const countriesData = await countriesResponse.json();
        // console.log("Countries data loaded:", countriesData);

        if (countriesData && Array.isArray(countriesData.countries)) {
          setCountries(countriesData.countries);
        } else {
          console.error(
            "Countries data is not in the expected format:",
            countriesData,
          );
        }

        // Fetch sales representatives data
        const salesResponse = await fetch(
          `/api/sales/lead/salesStaff${salesUidParam}`,
        ); //-- new code added --
        if (!salesResponse.ok) {
          throw new Error(
            `Failed to fetch sales representatives: ${salesResponse.status}`,
          );
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
  }, [user]);

  // Create option getter functions

  const getPhoneCodeOptions = (): OptionItem[] => {
    if (countries.length === 0) {
      return [{ value: "", label: "Loading codes..." }];
    }

    // 1. Get all IDDs
    const allIdds = countries
      .map((country) => country.idd)
      .filter((idd): idd is string => !!idd);

    // 2. Filter for unique IDDs (e.g., Singapore, Malaysia, Philippines all have GMT+8 but different IDDs)
    const uniqueIdds = Array.from(new Set(allIdds));

    // 3. Map to OptionItem format
    const options: OptionItem[] = uniqueIdds.map((idd) => ({
      value: idd,
      label: idd,
    }));

    // Optional: Sort them if you like
    options.sort((a, b) => a.label.localeCompare(b.label));

    // Optional: Add a default 'Select Code' option at the top
    // options.unshift({ value: "", label: "Select Code" });

    return options;
  };

  const getCountryOptions = () => {
    if (countries.length === 0) {
      return [{ value: "", label: "Loading countries..." }];
    }

    return countries.map((country) => ({
      value: country.name,
      label: country.name,
    }));
  };

  const getStateOptions = () => {
    if (!formData.country || countries.length === 0) {
      return [{ value: "", label: "Select country first" }];
    }

    const country = countries.find((c) => c.name === formData.country);
    if (!country) {
      return [{ value: "", label: "No states found" }];
    }

    return country.states.map((state) => ({
      value: state.name,
      label: state.name,
    }));
  };

  const getCityOptions = () => {
    if (!formData.country || !formData.state || countries.length === 0) {
      return [{ value: "", label: "Select state first" }];
    }

    const country = countries.find((c) => c.name === formData.country);
    if (!country) {
      return [{ value: "", label: "No cities found" }];
    }

    const state = country.states.find((s) => s.name === formData.state);
    if (!state) {
      return [{ value: "", label: "No cities found" }];
    }

    return state.cities.map((city) => ({
      value: city,
      label: city,
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

  useEffect(() => {
  // Run this logic only in edit mode when data and countries are available
  if (isEditMode && data.length > 0 && countries.length > 0) {
    const leadData = data[0];
    const initialFormData = { ...leadData }; // Start with all fetched data

    // Get all possible country codes and sort them by length, longest first.
    // This is crucial to correctly match "+60" instead of just "+6".
    const allIdds = countries
      .map((c) => c.idd)
      .filter(Boolean) // Remove any empty/null IDDs
      .sort((a, b) => b.length - a.length);

    // --- PARSING LOGIC FOR Primary Phone (phone1) ---
    if (leadData.phone1) {
      const foundIdd = allIdds.find((idd) => leadData.phone1.startsWith(idd));

      if (foundIdd) {
        initialFormData.phone_idd = foundIdd;
        initialFormData.phone_no = leadData.phone1.substring(foundIdd.length);
      } else {
        // Fallback if no matching country code is found
        initialFormData.phone_no = leadData.phone1;
      }
    }

    // --- PARSING LOGIC FOR Secondary Phone (phone2) ---
    if (leadData.phone2) {
      const foundIdd2 = allIdds.find((idd) => leadData.phone2.startsWith(idd));

      if (foundIdd2) {
        initialFormData.phone_idd2 = foundIdd2;
        initialFormData.phone_no2 = leadData.phone2.substring(
          foundIdd2.length,
        );
      } else {
        // Fallback for the secondary number
        initialFormData.phone_no2 = leadData.phone2;
      }
    }

    setFormData(initialFormData);
  }
}, [data, countries, isEditMode]); // This effect depends on these states

  const column: Column[] = [
    {
      title: "Source",
      inputType: "select",
      valueKey: "source",
      required: true,
      options: [
        { value: "FB", label: "FB" },
        { value: "TikTok", label: "TikTok" },
        { value: "小红书", label: "小红书" },
        { value: "Website", label: "Website" },
        { value: "Walk-in", label: "Walk-in" },
        { value: "Referral", label: "Referral" },
        { value: "Dealer", label: "Dealer" },
        { value: "Other", label: "Other" },
      ],
    },
    {
      title: "Name",
      inputType: "text",
      valueKey: "name",
      required: true,
    },

    // {
    //   title: "Primary Phone",
    //   inputType: "text",
    //   valueKey: "phone1",
    //   required: true,
    // },
    // // New Phone Code column for Primary Phone
    // {
    //   title: "P. Code",
    //   inputType: "select",
    //   valueKey: "phone_code1", // New valueKey
    //   defaultValue:
    //     countries.find((c) => c.name === formData.country)?.idd || "+60", // Default to +60 if country is Malaysia or not set
    //   options: getPhoneCodeOptions(), // Use the new function
    //   required: true,
    //   transform: (value: string, allValues: Record<string, any>) => {
    //     // Find the country associated with the selected phone code (best effort)
    //     const country = countries.find((c) => c.idd === value);

    //     // If a country is found and the current country is empty, set the country
    //     if (country && !allValues.country) {
    //       return {
    //         country: country.name,
    //       };
    //     }
    //     return {};
    //   },
    // },
    // {
    //   title: "Primary Phone",
    //   inputType: "text",
    //   valueKey: "phone1", // Changed valueKey to avoid conflict
    //   required: true,
    //   dependencies: ["phone_code1"], // This field depends on phone_code1
    //   transform: (value: string, allValues: Record<string, any>) => {
    //     // Construct the full phone number for storage
    //     const fullNumber = `${allValues.phone_code1}${value.replace(/^0+/, "")}`; // Remove leading zeros from phone number

    //     // Return object to update the final phone number field in the form data
    //     return {
    //       phone_number: fullNumber, // This key will be used for the final submission data
    //     };
    //   },
    // },
    // 3 Oct
    // --- ADD THIS NEW BLOCK ---
    {
      title: "Primary Phone",
      inputType: "composite",
      valueKey: "primary_phone_composite", // A unique key for the group
      required: true,
      subFields: [
        {
          title: "P. Code",
          inputType: "select",
          valueKey: "phone_idd",
          defaultValue:
            countries.find((c) => c.name === formData.country)?.idd || "+60",
          options: getPhoneCodeOptions(),
          required: true,
          // transform: (value: string, allValues: Record<string, any>) => {
          //   const country = countries.find((c) => c.idd === value);
          //   if (country && !allValues.country) {
          //     return {
          //       country: country.name,
          //     };
          //   }
          //   return {};
          // },
          //v1.2 gemini
          transform: (value: string, allValues: Record<string, any>) => {
            // When IDD changes, update the combined 'phone1' field
            const combinedPhone = `${value}${allValues.phone_no || ""}`.replace(
              /^0+/,
              "",
            );

            // const updates: Record<string, any> = {
            //   phone1: combinedPhone,
            // };

            // const country = countries.find((c) => c.idd === value);
            // if (country && !allValues.country) {
            //   updates.country = country.name;
            // }
            // return updates;
            // The logic to update the country has been REMOVED.
            return {
              phone1: combinedPhone,
            };
          },
          className: "flex-none w-28", // Sets a fixed width for the dropdown
        },
        {
          title: "Primary Phone Number",
          inputType: "text",
          valueKey: "phone_no",
          required: true,
          // dependencies: ["phone_code1"],
          // transform: (value: string, allValues: Record<string, any>) => {
          //   const fullNumber = `${allValues.phone_code1}${value.replace(
          //     /^0+/,
          //     "",
          //   )}`;
          //   return {
          //     phone_number: fullNumber,
          //   };
          // },
          //v1.2 gemini
          transform: (value: string, allValues: Record<string, any>) => {
            // When the local number changes, update the combined 'phone1' field
            const combinedPhone =
              `${allValues.phone_idd || ""}${value}`.replace(/^0+/, "");
            return {
              phone1: combinedPhone,
            };
          },
          className: "flex-grow", // Allows the text input to fill remaining space
        },
      ],
    },
    // ----------------------------
    // {
    //   title: "Secondary Phone",
    //   inputType: "text",
    //   valueKey: "phone2",
    // },
    {
      title: "Secondary Phone",
      inputType: "composite",
      valueKey: "secondary_phone_composite", // A unique key for the group
      subFields: [
        {
          title: "S. Code",
          inputType: "select",
          valueKey: "phone_idd2",
          defaultValue:
            countries.find((c) => c.name === formData.country)?.idd || "+60",
          options: getPhoneCodeOptions(),
          required: true,

          //v1.2 gemini
          transform: (value: string, allValues: Record<string, any>) => {
            // When IDD changes, update the combined 'phone2' field
            const combinedPhone2 =
              `${value}${allValues.phone_no || ""}`.replace(/^0+/, "");

            // const updates: Record<string, any> = {
            //   phone2: combinedPhone2,
            // };

            // const country = countries.find((c) => c.idd === value);
            // if (country && !allValues.country) {
            //   updates.country = country.name;
            // }
            // return updates;
            // The logic to update the country has been REMOVED.
            return {
              phone2: combinedPhone2,
            };
          },
          className: "flex-none w-28", // Sets a fixed width for the dropdown
        },
        {
          title: "Secondary Phone Number",
          inputType: "text",
          valueKey: "phone_no2",

          //v1.2 gemini
          transform: (value: string, allValues: Record<string, any>) => {
            // When the local number changes, update the combined 'phone2' field
            const combinedPhone2 =
              `${allValues.phone_idd2 || ""}${value}`.replace(/^0+/, "");
            return {
              phone2: combinedPhone2,
            };
          },
          className: "flex-grow",
        },
      ],
    },
    {
      title: "Email",
      inputType: "email",
      valueKey: "email",
    },
    {
      title: "NRIC",
      inputType: "text",
      valueKey: "nric",
    },

    {
      title: "Address Line",
      inputType: "text",
      valueKey: "address_line1",
    },
    {
      title: "Address Line 2",
      inputType: "text",
      valueKey: "address_line2",
    },
    {
      title: "Postcode",
      inputType: "text",
      valueKey: "postcode",
    },
    {
      title: "Country",
      inputType: "select",
      valueKey: "country",
      // defaultValue: "Malaysia",
      options: getCountryOptions(), // Use the country options function
      required: true,
    },
    {
      title: "State",
      inputType: "select",
      valueKey: "state",
      options: getStateOptions(), // Use the state options function
      required: true,
    },
    {
      title: "City",
      inputType: "select",
      valueKey: "city",
      options: getCityOptions(), // Use the city options function
    },
    {
      title: "Insterested",
      inputType: "select",
      valueKey: "interested",
      required: true,
      options: [
        { value: "Package", label: "Package" },
        { value: "Non-package", label: "Non-package" },
        { value: "Accessory", label: "Accessory" },
        { value: "Other", label: "Other" },
      ],
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
      title: "Additional Information",
      inputType: "text",
      valueKey: "add_info",
    },
    {
      title: "Status",
      inputType: "select",
      valueKey: "status",
      required: true,
      defaultValue: "Not Assign",
      options: [
        { value: "Not Assign", label: "Not Assign" },
        { value: "Assign PIC", label: "Assign PIC" },
        { value: "Follow Up", label: "Follow UP" },
        { value: "Visit Showroom", label: "Visit Showroom" },
        { value: "Quotation", label: "Quotation" },
        { value: "Payment", label: "Payment" },
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
      transform: (value: string, _allValues: Record<string, any>) => {
        // When a valid sales representative is selected (not empty)
        if (value && value !== "") {
          // Return object to update status to "Follow Up"
          return {
            status: "Assign PIC",
          };
        }
        return {}; // No changes if no rep selected
      },
      options: salesReps.map((rep) => ({
        value: rep.id,
        label: `${rep.uid} ${rep.name} (${rep.task_count || 0})`,
      })) || [{ value: "", label: "Loading sales representatives..." }],
    },
  ];

  return (
    <DefaultLayout>
      <Breadcrumb
        pageName={
          isEditMode ? `Edit Lead (${data[0]?.id || "N/A"})` : "New Lead"
        }
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
}
