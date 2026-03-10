"use client";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Form from "@/components/FormElements/FormUni";
import { useEffect, useState, useRef, useMemo } from "react";
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
  const hasInitialized = useRef(false);

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
        );
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

  const column: Column[] = useMemo(() => {
    // Option getter functions inside useMemo
    const getPhoneCodeOptions = (): OptionItem[] => {
      if (countries.length === 0) {
        return [{ value: "", label: "Loading codes..." }];
      }
      const allIdds = countries
        .map((country) => country.idd)
        .filter((idd): idd is string => !!idd);
      const uniqueIdds = Array.from(new Set(allIdds));
      const options: OptionItem[] = uniqueIdds.map((idd) => ({
        value: idd,
        label: idd,
      }));
      options.sort((a, b) => a.label.localeCompare(b.label));
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

    return [
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
        forceUppercase: true,
      },
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
            transform: (value: string, allValues: Record<string, any>) => {
              // When IDD changes, update the combined 'phone1' field
              const combinedPhone =
                `${value}${allValues.phone_no || ""}`.replace(/^0+/, "");
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
            transform: (value: string, allValues: Record<string, any>) => {
              // When IDD changes, update the combined 'phone2' field
              const combinedPhone2 =
                `${value}${allValues.phone_no2 || ""}`.replace(/^0+/, "");
              return {
                phone2: combinedPhone2,
              };
            },
            className: "flex-none w-28",
          },
          {
            title: "Secondary Phone Number",
            inputType: "text",
            valueKey: "phone_no2",
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
        forceUppercase: true,
      },
      {
        title: "Address Line 2",
        inputType: "text",
        valueKey: "address_line2",
        forceUppercase: true,
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
        title: "Interested",
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
        transform: (value: string) => {
          // Automatically clear assignment if user manually sets status back to 'Not Assign'
          if (value === "Not Assign") {
            return {
              sales_id: null,
              assigned_by: "",
            };
          }
          return {};
        },
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
        defaultValue: "",
        transform: (value: string, _allValues: Record<string, any>) => {
          // If a valid representative is selected
          if (value && value !== "") {
            return {
              status: "Assign PIC",
              assigned_by: user?.uid, // Sets the current user's UID
            };
          }

          return {
            status: "Not Assign",
            assigned_by: "",
            sales_id: null, // Send null to prevent SQL integer errors
          };
        },
        options: salesReps.map((rep: any) => ({
          value: rep.id,
          label: `${rep.uid} ${rep.name} (${rep.task_count || 0})`,
        })) || [{ value: "", label: "Loading sales representatives..." }],
      },
      {
        title: "Assigned By",
        inputType: "text",
        valueKey: "assigned_by",
        readOnly: true, // Field remains non-editable by the user
      },
    ];
    // pass `user` as a dependency so the transform function
  }, [formData, countries, salesReps, user]);

  //v1.4 gemini
  useEffect(() => {
    // This guard ensures the logic runs only once when all necessary data is ready.
    if (
      loading ||
      hasInitialized.current ||
      countries.length === 0 ||
      salesReps.length === 0
    ) {
      return;
    }
    // For edit mode, we must wait for data to be loaded.
    if (isEditMode && data.length === 0) {
      return;
    }

    // Step 1: Establish the base data (either from a fetched record or an empty object)
    const initialValues = isEditMode ? { ...data[0] } : {};

    // Step 2: Apply default values from your column definitions to any fields that are empty.
    // This is the key step that will put "+60" into the formData state.
    const applyDefaults = (col: Column) => {
      // Use `== null` to catch both undefined and null, but not an empty string ""
      if (col.defaultValue && initialValues[col.valueKey] == null) {
        initialValues[col.valueKey] = col.defaultValue;
      }
      col.subFields?.forEach(applyDefaults); // Recursively apply to sub-fields
    };
    column.forEach(applyDefaults);

    // Step 3: Now, parse the phone numbers if they exist from the fetched data.
    if (isEditMode) {
      const allIdds = countries
        .map((c) => c.idd)
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);

      if (initialValues.phone1) {
        const foundIdd = allIdds.find((idd) =>
          initialValues.phone1.startsWith(idd),
        );
        if (foundIdd) {
          initialValues.phone_idd = foundIdd;
          initialValues.phone_no = initialValues.phone1.substring(
            foundIdd.length,
          );
        } else {
          initialValues.phone_no = initialValues.phone1;
        }
      }

      if (initialValues.phone2) {
        const foundIdd2 = allIdds.find((idd) =>
          initialValues.phone2.startsWith(idd),
        );
        if (foundIdd2) {
          initialValues.phone_idd2 = foundIdd2;
          initialValues.phone_no2 = initialValues.phone2.substring(
            foundIdd2.length,
          );
        } else {
          initialValues.phone_no2 = initialValues.phone2;
        }
      }
    }

    // Step 4: Set the fully prepared state and mark initialization as complete.
    setFormData(initialValues);
    hasInitialized.current = true;
  }, [isEditMode, data, countries, salesReps, loading, column]);

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
