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
  // Add a new property to handle validation
  validate?: (value: string) => Promise<string | null>;
  // ---- ADD THESE TWO LINES ----
  className?: string; // For custom styling
  subFields?: Column[]; // For composite fields
  forceUppercase?: boolean;
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

  const [phoneValidation, setPhoneValidation] = useState<
    Record<string, string | null>
  >({});

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

  // The function for fieldKey ('phone1' or 'phone2')
  const checkPhoneNumber = async (
    phone: string,
    fieldKey: "phone1" | "phone2",
  ) => {
    if (!phone || phone.length < 5) {
      setPhoneValidation((prev) => ({ ...prev, [fieldKey]: null }));
      return;
    }

    try {
      const response = await fetch(
        `/api/sales/lead/create/checkPhone?phone=${encodeURIComponent(phone)}`,
      );

      if (!response.ok) {
        throw new Error("API Error");
      }

      const result = await response.json();

      const message = result.exists
        ? `This number belongs to: ${result.customer.name} (ID: ${result.customer.id})`
        : null;

      setPhoneValidation((prev) => ({ ...prev, [fieldKey]: message }));
    } catch (error) {
      console.error("Error validating phone number:", error);
      setPhoneValidation((prev) => ({
        ...prev,
        [fieldKey]: "Could not validate phone number.",
      }));
    }
  };

  // handleChange checks for both phone1 and phone2
  const handleChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
  ) => {
    const { name, value } = e.target;
    let columnDefinition: Column | undefined;

    for (const col of columns) {
      if (col.valueKey === name) {
        columnDefinition = col;
        break;
      }
      if (col.inputType === "composite" && col.subFields) {
        const subField = col.subFields.find((sf) => sf.valueKey === name);
        if (subField) {
          columnDefinition = subField;
          break;
        }
      }
    }

    // --- 2. Check for Uppercase Requirement (THE NEW LOGIC) ---
    let newValue = value;
    // Only attempt to uppercase if we found a column definition AND it's explicitly marked.
    // We also check e.target instanceof HTMLInputElement to avoid uppercasing select/dropdowns.
    if (
      columnDefinition?.forceUppercase &&
      e.target instanceof HTMLInputElement
    ) {
      newValue = value.toUpperCase();
    }

    if (columnDefinition?.transform) {
      const transformedValues = columnDefinition.transform(
        newValue,
        formData || {},
        columnDefinition.options,
      );

      // Trigger validation for Primary Phone if it was updated
      if (transformedValues.phone1) {
        checkPhoneNumber(transformedValues.phone1, "phone1");
      }

      // Trigger validation for Secondary Phone if it was updated
      if (transformedValues.phone2) {
        checkPhoneNumber(transformedValues.phone2, "phone2");
      }

      setFormData((prevData) => ({
        ...prevData,
        ...transformedValues,
        [name]: newValue,
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: newValue,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missingRequiredFields: string[] = [];

    columns.forEach((col) => {
      // If it's a composite field, check its required sub-fields
      if (col.inputType === "composite") {
        if (col.required) {
          const isMissing = col.subFields?.some(
            (subField) =>
              subField.required &&
              (!formData[subField.valueKey] ||
                formData[subField.valueKey] === ""),
          );
          if (isMissing) {
            missingRequiredFields.push(col.title);
          }
        }
      } else {
        // Original logic for simple fields
        if (
          col.required &&
          (!formData[col.valueKey] || formData[col.valueKey] === "")
        ) {
          missingRequiredFields.push(col.title);
        }
      }
    });

    if (missingRequiredFields.length > 0) {
      alert(
        `Please fill in the following required fields: ${missingRequiredFields.join(", ")}`,
      );
      return;
    }

    // Check both phone fields for validation issues before submitting
    if (
      (phoneValidation.phone1 || phoneValidation.phone2) &&
      data.length === 0
    ) {
      const confirmSubmit = window.confirm(
        "A record with one of these phone numbers may already exist. Do you want to continue?",
      );
      if (!confirmSubmit) {
        return;
      }
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
            //validation phone no
            let validationMessageKey: "phone1" | "phone2" | null = null;
            if (column.valueKey === "primary_phone_composite") {
              validationMessageKey = "phone1";
            } else if (column.valueKey === "secondary_phone_composite") {
              validationMessageKey = "phone2";
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

                {/* Composite Field Rendering Logic */}
                {column.inputType === "composite" ? (
                  <div className="flex w-full items-start space-x-2">
                    {column.subFields?.map((subField, subIndex) => {
                      const subFieldValue = formData?.[subField.valueKey] || "";

                      return (
                        <div
                          key={subIndex}
                          className={subField.className || "grow"}
                        >
                          {subField.inputType === "select" ? (
                            <select
                              id={subField.valueKey}
                              name={subField.valueKey}
                              value={
                                subFieldValue || subField.defaultValue || ""
                              }
                              onChange={handleChange}
                              required={subField.required}
                              className="border-stroke focus:border-primary active:border-primary disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-sm border-[1.5px] bg-transparent px-5 py-3 font-medium outline-hidden transition disabled:cursor-default dark:text-white"
                            >
                              <option value="" disabled>
                                Select an option
                              </option>
                              {subField.options?.map((option, idx) => (
                                <option key={idx} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={subField.inputType || "text"}
                              id={subField.valueKey}
                              name={subField.valueKey}
                              value={subFieldValue}
                              onChange={handleChange}
                              readOnly={subField.readOnly}
                              required={subField.required}
                              className={`border-stroke focus:border-primary active:border-primary disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 font-medium outline-hidden transition disabled:cursor-default dark:text-white ${
                                subField.readOnly
                                  ? "dark:bg-form-input cursor-not-allowed bg-gray-100 opacity-70"
                                  : ""
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : column.inputType === "select" ? (
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
                ) : (
                  <input
                    type={column.inputType || "text"}
                    id={column.valueKey}
                    name={column.valueKey}
                    value={currentValue}
                    onChange={handleChange}
                    readOnly={column.readOnly}
                    required={column.required}
                    className={`border-stroke focus:border-primary active:border-primary disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 font-medium outline-hidden transition disabled:cursor-default dark:text-white uppercase${
                      column.readOnly
                        ? "dark:bg-form-input cursor-not-allowed bg-gray-100 opacity-70"
                        : ""
                    }`}
                  />
                )}

                {/* Display validation message for the correct field */}
                {validationMessageKey &&
                  phoneValidation[validationMessageKey] && (
                    <p className="text-meta-1 mt-2 text-sm">
                      {phoneValidation[validationMessageKey]}
                    </p>
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
