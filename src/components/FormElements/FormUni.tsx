"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import "./styles.css"; // Import the CSS file

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
  transform?: (
    value: any,
    allValues: Record<string, any>,
    options?: any[],
  ) => any;
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
  const [internalFormData, setInternalFormData] = useState<Record<string, any>>(
    {},
  );
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
    if (!initializedRef.current && optionsLoaded && !loading) {
      // Create initial data object - either from existing data or empty object
      const initialData: Record<string, any> =
        data.length > 0 ? { ...data[0] } : {};

      // Apply default values for all fields that don't have values
      columns.forEach((column) => {
        const valueKey = column.valueKey;
        const currentValue = initialData[valueKey];

        // Don't apply defaults to section headers
        if (column.inputType === "section") {
          return;
        }

        // If field doesn't have a value but has a defaultValue, use the defaultValue
        if (
          (currentValue === undefined ||
            currentValue === null ||
            currentValue === "") &&
          column.defaultValue !== undefined
        ) {
          initialData[valueKey] = column.defaultValue;
        }

        // Format dropdown values to strings
        if (
          column.inputType === "select" &&
          initialData[valueKey] !== undefined
        ) {
          initialData[valueKey] = String(initialData[valueKey]);
        }
      });

      // console.log("Initializing form with data:", initialData);
      initializedRef.current = true;
      setFormData(initialData);
    }
  }, [data, loading, optionsLoaded, columns, setFormData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
  ) => {
    const { name, value } = e.target;
    // console.log("Field changed:", name, value);

    const column = columns.find((col) => col.valueKey === name);

    if (column?.transform) {
      const transformedValues = column.transform(
        value,
        formData || {},
        column.options,
      );
      setFormData((prevData) => ({
        ...prevData,
        ...transformedValues,
        [name]: value,
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for required fields
    const missingRequiredFields = columns
      .filter(
        (col) =>
          col.required &&
          (!formData[col.valueKey] || formData[col.valueKey] === ""),
      )
      .map((col) => col.title);

    if (missingRequiredFields.length > 0) {
      alert(
        `Please fill in the following required fields: ${missingRequiredFields.join(", ")}`,
      );
      return;
    }

    setSubmitting(true);

    try {
      // Show confirmation for updates
      if (data.length > 0) {
        const confirmUpdate = window.confirm(
          `Update ${formTitle} (${data[0]?.id})?`,
        );
        if (!confirmUpdate) {
          setSubmitting(false);
          return;
        }
      }

      const url =
        data.length > 0 ? `${submitUrl}?id=${data[0]?.id}` : submitUrl;

      const method = data.length > 0 ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
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

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="dark:bg-boxdark dark:border-strokedark rounded-lg bg-white p-4 shadow-md"
      >
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {columns.map((column, index) => {
            const currentValue = formData?.[column.valueKey] || "";

            // Skip rendering for section headers - they need special handling
            if (column.inputType === "section") {
              return (
                <div key={index} className="col-span-full mt-2 mb-6">
                  <h2 className="border-stroke dark:border-strokedark border-b pb-2 text-xl font-semibold text-black dark:text-white">
                    {column.title}
                  </h2>
                </div>
              );
            }

            return (
              <div key={index} className="mb-4">
                <label
                  htmlFor={column.valueKey}
                  className="mb-2 block font-semibold text-black dark:text-white"
                >
                  {column.title}
                  {column.required && (
                    <span className="text-meta-1 ml-1">*</span>
                  )}
                </label>

                {column.inputType === "select" ? (
                  <select
                    id={column.valueKey}
                    name={column.valueKey}
                    value={currentValue || column.defaultValue || ""}
                    onChange={handleChange}
                    required={column.required}
                    className="border-stroke focus:border-primary active:border-primary disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-5 py-3 font-medium outline-hidden transition disabled:cursor-default dark:text-white"
                  >
                    <option value="">Select an option</option>
                    {column.options?.map((option, idx) => (
                      <option key={idx} value={option.value}>
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
                    className="border-stroke focus:border-primary active:border-primary disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-5 py-3 font-medium outline-hidden transition disabled:cursor-default dark:text-white"
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
                    className={`border-stroke focus:border-primary active:border-primary disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 font-medium outline-hidden transition disabled:cursor-default dark:text-white ${
                      column.readOnly
                        ? "dark:bg-form-input cursor-not-allowed bg-gray-100 opacity-70"
                        : ""
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-start space-x-4">
          <button
            type="button"
            onClick={() => router.push(redirectUrl)}
            className="border-stroke hover:shadow-1 dark:border-strokedark flex justify-center rounded-sm border px-6 py-2 font-medium text-black dark:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`text-gray hover:shadow-1 flex justify-center rounded px-6 py-2 font-medium hover:opacity-90 disabled:opacity-50 ${
              data.length > 0
                ? "bg-warning" // Orange for edit/update
                : "bg-blue-600" // Blue for new/submit
            }`}
          >
            {submitting
              ? "Processing..."
              : data.length > 0
                ? "Update"
                : "Submit"}
          </button>
        </div>
      </form>
      <div className="mt-4">
        <p className="text-bodydark2 dark:text-bodydark text-sm">
          <span className="text-meta-1">*</span> Required fields
        </p>
      </div>
    </div>
  );
};

export default FormUni;
