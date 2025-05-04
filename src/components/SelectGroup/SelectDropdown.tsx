import { useState } from "react";

const SelectDropdown = () => {
  const [selectedActions, setSelectedActions] = useState("");

  return (
    <div>
      <label className="mb-3 block font-medium text-black dark:text-white">
        Sub-menu:
        <div className="relative ml-4 inline-block">
          <select
            className="border-stroke focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input w-[120px] cursor-pointer appearance-none rounded-lg border bg-transparent py-2 pr-8 pl-3 outline-none"
            value={selectedActions}
            onChange={(e) => setSelectedActions(e.target.value)}
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
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
