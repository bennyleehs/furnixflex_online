// src/components/SelectGroup/SelectDropdown.tsx
import { useState, useEffect } from "react";

type Action = {
  name: string;
  description: string;
  type: string;
};

type SelectDropdownProps = {
  subSectionId: string;
  path?: string;
  section?: string;
  id: string; // Add id to uniquely identify this dropdown
  onChange: (id: string, value: string) => void; // Add callback to report changes
  initialValue?: string; // Add initial value prop
};

const SelectDropdown = ({
  subSectionId,
  path,
  section,
  id,
  onChange,
  initialValue = "",
}: SelectDropdownProps) => {
  const [selectedActions, setSelectedActions] = useState(initialValue);
  const [options, setOptions] = useState<
    { value: string; label: string; disabled?: boolean }[]
  >([
    { value: "", label: "Assign action", disabled: true },
    { value: "0", label: "0 - Clear Access" },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // When selection changes, notify parent component
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedActions(value);
    onChange(id, value);
  };

  const formatOptionLabel = (label: string) => {
    if (!selectedActions) {
      return label; // Show the bracketed text when the dropdown is open
    }
    return label.split("(")[0].trim(); // Remove the bracketed text after selection
  };

  const formatPath = (path: string, section: string) => {
    if (!path) return "Sub-menu:";

    if (path.startsWith(section)) {
      // Only add slash if there's something after the section
      const remaining = path.substring(section.length);
      return remaining.startsWith("/") ? remaining.substring(1) : remaining;
    }

    return path;
  };

  useEffect(() => {
    const fetchActions = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log("Fetching actions...");
        // Updated API endpoint to fetch from access_action.json
        const response = await fetch("/api/admin/scopes_access/access_action");

        console.log("Response status:", response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Fetched data:", data);

        if (data && Array.isArray(data.action)) {
          const formattedOptions = data.action.map((action: Action) => ({
            value: action.type,
            label: `${action.type} - ${action.name} (${action.description})`,
          }));

          setOptions([
            { value: "", label: "Assign action", disabled: true },
            { value: "0", label: "0 - Clear Access" },
            ...formattedOptions,
          ]);

          console.log("Options set:", formattedOptions);
        } else {
          console.error("Invalid data format:", data);
          throw new Error("Invalid data format received from API");
        }
      } catch (error) {
        console.error("Failed to fetch actions:", error);
        setError(error instanceof Error ? error.message : "Unknown error");

        // Fallback to static options if API fails
        setOptions([
          { value: "", label: "Assign action", disabled: true },
          { value: "0", label: "0 - Clear Access" },
          { value: "1", label: "1 - Mark As History (Delete)" },
          { value: "2", label: "2 - Make Changes (Update)" },
          { value: "3", label: "3 - New Entry (Create)" },
          { value: "4", label: "4 - Monitor Only (Read)" },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchActions();
  }, []);

  // Set initial value when it changes from parent
  useEffect(() => {
    if (initialValue) {
      setSelectedActions(initialValue);
    }
  }, [initialValue]);

  return (
    <div className="mt-2 md:my-2 grid md:grid-cols-2">
      <label className="mr-4 mb-2 block font-medium text-black dark:text-white">
        {subSectionId && section && path
          ? `${subSectionId}. ${formatPath(path, section)}`
          : path || "Sub-menu:"}
      </label>
      <div className="relative inline-block">
        <select
          className="border-stroke focus:border-primary active:border-primary disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded border-[1.5px] bg-transparent px-5 py-3 font-medium outline-hidden transition disabled:cursor-default dark:text-white"
          value={loading ? "" : selectedActions} // 👈 key point
          onChange={handleChange}
          id={id}
          disabled={loading}
        >
          {loading ? (
            <option value="" disabled>
              Loading...
            </option>
          ) : (
            options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {formatOptionLabel(option.label)}
              </option>
            ))
          )}
        </select>
      </div>
      {error && (
        <div className="ml-4 text-sm text-red-500">
          Error loading actions: Using fallback options
        </div>
      )}
    </div>
  );
};

export default SelectDropdown;
