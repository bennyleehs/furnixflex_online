// src/components/SelectGroup/SelectDropdown.tsx
import { useState } from "react";

const SelectDropdown = () => {
  const [selectedActions, setSelectedActions] = useState("");

  const formatOptionLabel = (label: string) => {
    if (!selectedActions) {
      return label; // Show the bracketed text when the dropdown is open
    }
    return label.split("(")[0].trim(); // Remove the bracketed text after selection
  };

  const options = [
    { value: "", label: "Assign action", disabled: true },
    { value: "1", label: "1 - Mark As History (Delete)" },
    { value: "2", label: "2 - Make Changes (Update)" },
    { value: "3", label: "3 - New Entry (Create)" },
    { value: "4", label: "4 - Monitor Only (Read)" },
  ];

  return (
    <div>
      <label className="mb-3 block font-medium text-black dark:text-white">
        Sub-menu:
        <div className="relative ml-4 inline-block">
          <select
            className="border-stroke focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input w-[200px] cursor-pointer appearance-none rounded-lg border bg-transparent py-2 pr-8 pl-3 outline-none"
            value={selectedActions}
            onChange={(e) => setSelectedActions(e.target.value)}
          >
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {formatOptionLabel(option.label)}
              </option>
            ))}
          </select>

          <div className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 transform">
            <svg
              className="fill-crrent h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </label>
    </div>
  );
};

export default SelectDropdown;
