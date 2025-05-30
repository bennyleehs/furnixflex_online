'use client';
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import './styles.css'; // Import the CSS file

interface OptionItem {
  value: string | number;
  label: string;
  meta?: Record<string, any>;
}

interface Column {
  title: string;
  inputType?: string;
  valueKey: string;
  defaultValue?: string;
  options?: OptionItem[];
  transform?: (value: any, allValues: Record<string, any>, options?: any[]) => any;
  readOnly?: boolean;
  required?: boolean;
}

interface Props<T> {
  columns: Column[];
  data: T[];
  formData?: Record<string, any>;
  setFormData?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  loading?: boolean;
  submitUrl: string;
  redirectUrl: string;
  formTitle?: string;
}

const FormUni = <T extends Record<string, any>>({ 
  columns,
  data, 
  formData: externalFormData,
  setFormData: externalSetFormData,
  loading = false, 
  submitUrl, 
  redirectUrl,
  formTitle = "item",
}: Props<T>) => {
  const [internalFormData, setInternalFormData] = useState<Record<string, any>>({});
  const [filteredOptions, setFilteredOptions] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [optionsLoaded, setOptionsLoaded] = useState(false); // Track when options are loaded
  const initializedRef = useRef(false); // Track initialization
  const router = useRouter();

  // Use either the external state or internal state
  const formData = externalFormData || internalFormData;
  const setFormData = externalSetFormData || setInternalFormData;

  // Initialize options for select inputs
  useEffect(() => {
    const newFilteredOptions: Record<string, any[]> = {};
    columns.forEach((column) => {
      if (column.inputType === "select" && column.options) {
        newFilteredOptions[column.valueKey] = column.options;
      }
    });
    setFilteredOptions(newFilteredOptions);
    setOptionsLoaded(true);
  }, [columns]);

  // IMPORTANT: Initialize form data when in edit mode (data exists)
  useEffect(() => {
    if ((!initializedRef.current) && optionsLoaded && !loading) {
      // Create initial data object - either from existing data or empty object
      const initialData: Record<string, any> = data.length > 0 ? { ...data[0] } : {};
      
      // Apply default values for all fields that don't have values
      columns.forEach(column => {
        const valueKey = column.valueKey;
        const currentValue = initialData[valueKey];
        
        // Don't apply defaults to section headers
        if (column.inputType === "section") {
          return;
        }
        
        // If field doesn't have a value but has a defaultValue, use the defaultValue
        if ((currentValue === undefined || currentValue === null || currentValue === "") 
            && column.defaultValue !== undefined) {
          initialData[valueKey] = column.defaultValue;
        }
        
        // Format dropdown values to strings
        if (column.inputType === "select" && initialData[valueKey] !== undefined) {
          initialData[valueKey] = String(initialData[valueKey]);
        }
      });
      
      // console.log("Initializing form with data:", initialData);
      initializedRef.current = true;
      setFormData(initialData);
    }
  }, [data, loading, optionsLoaded, columns, setFormData]);

  // Add after initializing formData
  useEffect(() => {
    // Track original sales_id for task count management
    if (data.length > 0 && data[0].sales_id) {
      setFormData(prev => ({
        ...prev,
        original_sales_id: data[0].sales_id
      }));
    }
  }, [data, setFormData]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    // console.log("Field changed:", name, value);
    
    const column = columns.find((col) => col.valueKey === name);
    
    if (column?.transform) {
      const transformedValues = column.transform(value, formData || {}, column.options);
      setFormData(prevData => ({
        ...prevData,
        ...transformedValues,
        [name]: value
      }));
    } else {
      setFormData(prevData => ({
        ...prevData,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for required fields
    const missingRequiredFields = columns
      .filter(col => col.required && (!formData[col.valueKey] || formData[col.valueKey] === ""))
      .map(col => col.title);
    
    if (missingRequiredFields.length > 0) {
      alert(`Please fill in the following required fields: ${missingRequiredFields.join(", ")}`);
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Show confirmation for updates
      if (data.length > 0) {
        const confirmUpdate = window.confirm(`Update ${formTitle} (${data[0]?.id})?`);
        if (!confirmUpdate) {
          setSubmitting(false);
          return;
        }
      }

      // Use the create endpoint for both operations
      const url = data.length > 0 
        ? `/api/sales/lead/create?id=${data[0]?.id}` 
        : `/api/sales/lead/create`;
      
      const method = data.length > 0 ? "PUT" : "POST";

      // Create payload with task count tracking information
      const payload = {
        ...formData,
        // Include original_sales_id for comparison in update operations
        original_sales_id: data.length > 0 ? formData.original_sales_id || data[0]?.sales_id : null,
        // Flag to request task count updates
        update_task_count: true
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to submit form");
      }

      // On success, redirect
      router.push(redirectUrl);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to submit form. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Update the form container and elements with dark mode styling
  return (
    <div>
      <form onSubmit={handleSubmit} className="p-4 bg-white rounded-sm shadow-md dark:bg-boxdark dark:border-strokedark">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {columns.map((column, index) => {
            const currentValue = formData?.[column.valueKey] || "";
            
            // Skip rendering for section headers - they need special handling
            if (column.inputType === "section") {
              return (
                <div key={index} className="col-span-full mb-6 mt-2">
                  <h2 className="text-xl font-semibold border-b pb-2 text-black dark:text-white border-stroke dark:border-strokedark">
                    {column.title}
                  </h2>
                </div>
              );
            }

            return (
              <div key={index} className="mb-4">
                <label htmlFor={column.valueKey} className="block mb-2 font-semibold text-black dark:text-white">
                  {column.title}
                  {column.required && <span className="text-meta-1 ml-1">*</span>}
                </label>
                
                {column.inputType === "select" ? (
                  <select
                    id={column.valueKey}
                    name={column.valueKey}
                    value={currentValue || column.defaultValue || ""}
                    onChange={handleChange}
                    required={column.required}
                    className="w-full rounded-sm border-[1.5px] border-stroke bg-transparent px-5 py-3 font-medium outline-hidden transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  >
                    <option value="">Select an option</option>
                    {column.options?.map((option, idx) => (
                      <option 
                        key={idx} 
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : column.inputType === "textarea" ? (
                  <textarea
                    id={column.valueKey}
                    name={column.valueKey}
                    value={currentValue}
                    // onChange={handleChange}
                    rows={4}
                    required={column.required}
                    className="w-full rounded-sm border-[1.5px] border-stroke bg-transparent px-5 py-3 font-medium outline-hidden transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                ) : (
                  <input
                    type={column.inputType || "text"}
                    id={column.valueKey}
                    name={column.valueKey}
                    value={currentValue}
                    onChange={handleChange}
                    readOnly={column.readOnly}
                    required={column.required}
                    className={`w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 font-medium outline-hidden transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary ${
                      column.readOnly 
                        ? "bg-gray-100 dark:bg-form-input cursor-not-allowed opacity-70" 
                        : ""
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-start space-x-4 mt-6">
          <button
            type="button"
            onClick={() => router.push(redirectUrl)}
            className="flex justify-center rounded-sm border border-stroke px-6 py-2 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`flex justify-center rounded px-6 py-2 font-medium text-gray hover:opacity-90 hover:shadow-1 disabled:opacity-50 ${
              data.length > 0 
                ? "bg-warning" // Orange for edit/update
                : "bg-blue-600 " // Blue for new/submit
            }`}
          >
            {submitting ? "Processing..." : data.length > 0 ? "Update" : "Submit"}
          </button>
        </div>
      </form>
      <div className="mt-4">
        <p className="text-sm text-bodydark2 dark:text-bodydark">
          <span className="text-meta-1">*</span> Required fields
        </p>
      </div>
    </div>
  );
};

export default FormUni;