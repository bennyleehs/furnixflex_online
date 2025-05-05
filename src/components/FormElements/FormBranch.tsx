'use client';
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import './styles.css'; // Import the CSS file

interface Column {
  title: string;
  inputType?: string;
  valueKey?: string;  // Key for display value
  min?: number;
  max?: number;
  options?: { 
    value?: string; 
    label?: string; 
    idd?: string[]; 
    timezones?: string[]; 
    currencies_code?: string; 
    currencies_symbol?: string 
  }[];
}

interface Props<T> {
  columns: Column[];
  data: T[];
  loading: boolean;
  submitUrl: string;
  redirectUrl: string;
}

const FormBranch = <T extends Record<string, any>>({ columns, data, loading, submitUrl, redirectUrl }: Props<T>) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [filteredOptions, setFilteredOptions] = useState<Record<string, { id: string | number; value: string }[]>>({});
  const [showSuccess, setShowSuccess] = useState(false); // State to control success message visibility
  const router = useRouter();

  useEffect(() => {
    const newFilteredOptions: Record<string, { id: string | number; value: string }[]> = {};
    
    // Process options for each column
    columns.forEach((column) => {
      if (column.inputType === "select" && column.valueKey && column.idKey) {
        // Extract relevant data for this column
        const columnOptions = data.length > 0
          ? data
              .filter(item => column.idKey && column.valueKey && column.idKey in item && column.valueKey in item)
              .map(item => ({
                id: item[column.idKey as keyof typeof item],
                value: item[column.valueKey as keyof typeof item]
              }))
          : column.options || [];
        
        // Remove duplicates if any
        const uniqueOptions = Array.from(
          new Map(columnOptions.map(item => [item.id, item])).values()
        );
        
        newFilteredOptions[column.title] = uniqueOptions;
      } else {
        newFilteredOptions[column.title] = column.options || [];
      }
    });
    
    setFilteredOptions(newFilteredOptions);
  }, [columns, data]);

  useEffect(() => {
    const newFormData: Record<string, any> = {};
    if (data.length > 0) {
      columns.forEach((column) => {
        if (column.valueKey) {
          newFormData[column.valueKey] = data[0]?.[column.valueKey] || "";
        } else {
          newFormData[column.title] = data[0]?.[column.title] || "";
        }
      });
    } else {
      columns.forEach((column) => {
        if (column.valueKey) {
          newFormData[column.valueKey] = "";
        } else {
          newFormData[column.title] = "";
        }
      });
    }
    setFormData(newFormData);
  }, [columns, data]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "country") {
      const selectedCountry = columns.find(
        column => column.title === "Country")?.
      options?.find(option => option.value === value);
      if (selectedCountry) {
        setFormData(prevData => ({
          ...prevData,
          [name]: value,
          time_zone: selectedCountry.timezones ? selectedCountry.timezones[0] : "",
          currencies_code: selectedCountry.currencies_code || "",
          currencies_symbol: selectedCountry.currencies_symbol || "",
          idd: selectedCountry.idd || ""
        }));
        return;
      }
    }

    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
/*
    // Validate that all required fields have data
    const isFormValid = columns.every((column) => {
      const value = formData[column.valueKey || column.title];
      return value !== undefined && value !== ""; // Ensure the field is not empty
    });

    if (!isFormValid) {
      alert("Please fill in all required fields.");
      return; // Stop submission if validation fails
    }
*/
    // Show a confirmation alert before updating
    if (data.length > 0) {
      const confirmUpdate = window.confirm(`Are you sure you want to update this branch (${data[0]?.id})?"`);
      if (!confirmUpdate) {
        return; // Stop submission if the user cancels
      }
    }

    try {
      const url = data.length > 0 
      ? `/api/admin/branch/create?id=${data[0]?.id}` // Use the branch ID for updates
      : '/api/admin/branch/create';

    const method = data.length > 0 ? 'PUT' : 'POST'; // Use PATCH for updates, POST for creation

    const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        throw new Error(`Failed to submit data: ${response.status} ${response.statusText}`);
      }

    // If it's an update, navigate back to the branch page
    if (data.length > 0) {
      router.push('/admin/branch'); // Replace with the correct route for the branch page
      return;
    }
      // Show the success message
      setShowSuccess(true);
      
    } catch (error) {
      console.error('Error submitting form data:', error);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false); // Close the success message
    setFormData({}); // Clear the form data

    // Scroll to the top of the form
    window.scrollTo({
      top: 0,
      behavior: "smooth", // Smooth scrolling
    });
  
  };

  return (
    <div>
      {/* Success Message Modal */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-md">
            <p className="text-lg font-semibold">Form submitted successfully!</p>
            <button
              onClick={handleCloseSuccess}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 bg-white rounded shadow-md dark:bg-boxdark">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {columns.map((column, index) => (
            <div key={index}>
              <label htmlFor={column.title} className="block mb-2 font-semibold dark:bg-boxdark">
                {column.title}
              </label>
              { column.inputType === "text" ? (
                <input
                  type="text"
                  id={column.title}
                  name={column.valueKey || column.title}
                  value={formData[column.valueKey || column.title] || ""}
                  onChange={handleChange}
                  className="w-full p-2 border rounded solid-black-text"
                />
              ) : column.inputType === "time" ? (
                <input
                  type="time"
                  id={column.title}
                  name={column.valueKey || column.title}
                  value={formData[column.valueKey || column.title] || ""}
                  onChange={handleChange}
                  className="w-full p-2 border rounded solid-black-text"
                />
              ) : column.inputType === "number" ? (
                <input
                  type="number"
                  id={column.title}
                  name={column.valueKey || column.title}
                  min={column.min}
                  max={column.max}
                  step={1}
                  value={formData[column.valueKey || column.title] || ""}
                  onChange={handleChange}
                  className="w-full p-2 border rounded solid-black-text"
                  placeholder="Enter minutes"
                />
              ) : (
                <select
                  id={column.title}
                  name={column.valueKey || column.title}
                  value={formData[column.valueKey || column.title] || ""}
                  onChange={handleChange}
                  className="w-full p-2 border rounded solid-black-text"
                  disabled={loading && column.inputType === "select"}
                >
                  <option value="">Select an option</option>
                  {filteredOptions[column.title]?.map((option, idx) => (
                    <option key={idx} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
        <button
          type="submit"
          className={`px-4 py-2 text-white rounded hover:bg-opacity-90 ${data.length > 0 ? "bg-orange-500 hover:bg-orange-600" : "bg-blue-500 hover:bg-blue-600"}`}
        >
          {data.length > 0 ? "Update" : "Submit"}
        </button>
      </form>
    </div>
  );
};

export default FormBranch;