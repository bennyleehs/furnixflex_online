'use client';
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Column {
  title: string;
  valueKey?: string;  // Key for display value
  idKey?: string;     // Key for ID value
  inputType?: string;
  min?: number;
  max?: number;
}

interface FormClockProps<T> {
  columns: Column[];
  data: T[];
  loading: boolean;
}

const FormClock = <T extends Record<string, any>>({ columns, data, loading }: FormClockProps<T>) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [filteredOptions, setFilteredOptions] = useState<Record<string, { id: string | number; value: string }[]>>({});
  const router = useRouter();

  useEffect(() => {
    const newFilteredOptions: Record<string, { id: string | number; value: string }[]> = {};
    
    // Process options for each column
    columns.forEach((column) => {
      if (column.inputType === "select" && column.valueKey && column.idKey) {
        // Extract relevant data for this column
        const columnOptions = data
          .filter(item => column.idKey && column.valueKey && 
                  column.idKey in item && column.valueKey in item)
          .map(item => ({
            id: item[column.idKey as keyof typeof item],
            value: item[column.valueKey as keyof typeof item]
          }));
        
        // Remove duplicates if any
        const uniqueOptions = Array.from(
          new Map(columnOptions.map(item => [item.id, item])).values()
        );
        
        newFilteredOptions[column.title] = uniqueOptions;
      } else {
        newFilteredOptions[column.title] = [];
      }
    });
    
    setFilteredOptions(newFilteredOptions);
  }, [columns, data]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (e.target.type === 'select-one') {
      // For select elements, find the selected option and store both id and value
      const selectedOption = filteredOptions[name]?.find(option => option.value === value);
      if (selectedOption) {
        setFormData(prevData => ({
          ...prevData,
          [`${name}Id`]: selectedOption.id,
          [name]: selectedOption.value
        }));
      }
    } else {
      // For other input types like time or number
      setFormData(prevData => ({
        ...prevData,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/clock/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        throw new Error(`Failed to submit data: ${response.status} ${response.statusText}`);
      }
      console.log('Form Data submitted successfully:', formData);
      router.replace('/admin/clock'); // Refresh the table page
    } catch (error) {
      console.error('Error submitting form data:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {columns.map((column, index) => (
          <div key={index}>
            <label htmlFor={column.title} className="block mb-2 font-semibold">
              {column.title}
            </label>
            {column.inputType === "time" ? (
              <input
                type="time"
                id={column.title}
                name={column.title}
                value={formData[column.title] || ""}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                disabled={loading}
              />
            ) : column.inputType === "number" ? (
              <input
                type="number"
                id={column.title}
                name={column.title}
                min={column.min}
                max={column.max}
                step={1}
                value={formData[column.title] || ""}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                placeholder="Enter minutes"
                disabled={loading}
              />
            ) : (
              <select
                id={column.title}
                name={column.title}
                value={formData[column.title] || ""}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                disabled={loading}
              >
                <option value="">Select an option</option>
                {(filteredOptions[column.title] || []).map((option, idx) => (
                  <option key={idx} value={option.value}>
                    {option.value}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        disabled={loading}
      >
        Submit
      </button>
    </form>
  );
};

export default FormClock;