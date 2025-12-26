// "use client";
// import { useState, useRef, useEffect } from "react";

// interface Option {
//   label: string;
//   value: string | number;
// }

// interface SearchableDropdownProps {
//   options: Option[];
//   value: string | number;
//   onChange: (value: string | number) => void;
//   placeholder?: string;
//   disabled?: boolean;
// }

// const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
//   options,
//   value,
//   onChange,
//   placeholder = "Select...",
//   disabled = false,
// }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");
//   const dropdownRef = useRef<HTMLDivElement | null>(null);

//   // Close dropdown when clicking outside
//   useEffect(() => {
//     const handleClickOutside = (event: { target: any }) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//         setIsOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   // Filter options based on search
//   const filteredOptions = options.filter((option) =>
//     option.label.toLowerCase().includes(searchTerm.toLowerCase()),
//   );

//   // Find the label for the currently selected value
//   const selectedLabel =
//     options.find((opt) => String(opt.value) === String(value))?.label || "";

//   return (
//     <div className="relative w-full" ref={dropdownRef}>
//       {/* The Trigger (looks like your old select) */}
//       <div
//         className={`w-full cursor-pointer border-b border-gray-300 px-1 py-1 text-sm dark:border-gray-600 ${
//           disabled ? "cursor-not-allowed opacity-50" : "hover:border-gray-400"
//         }`}
//         onClick={() => !disabled && setIsOpen(!isOpen)}
//       >
//         <div className="flex items-center justify-between">
//           <span className={selectedLabel ? "" : "text-gray-400"}>
//             {selectedLabel || placeholder}
//           </span>
//           <span className="text-xs text-gray-500">▼</span>
//         </div>
//       </div>

//       {/* The Dropdown Menu */}
//       {isOpen && (
//         <div className="absolute left-0 top-full z-9999 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
//           {/* Search Input */}
//           <div className="sticky top-0 bg-white p-2 dark:bg-gray-800">
//             <input
//               type="text"
//               className="w-full rounded-md border border-gray-300 p-1 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
//               placeholder="Search..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               autoFocus
//             />
//           </div>

//           {/* Options List */}
//           {filteredOptions.length > 0 ? (
//             filteredOptions.map((option) => (
//               <div
//                 key={option.value}
//                 className={`cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
//                   option.value === value
//                     ? "bg-gray-50 font-medium dark:bg-gray-900"
//                     : ""
//                 }`}
//                 onClick={() => {
//                   onChange(option.value);
//                   setIsOpen(false);
//                   setSearchTerm(""); // Reset search on select
//                 }}
//               >
//                 {option.label}
//               </div>
//             ))
//           ) : (
//             <div className="px-3 py-2 text-sm text-gray-500">
//               No results found
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// export default SearchableDropdown;

//v1.2
// "use client";

// import React, { useState, useRef, useEffect, useCallback } from "react";
// import { createPortal } from "react-dom";

// interface Option {
//   label: string;
//   value: string | number;
// }

// interface SearchableDropdownProps {
//   value: string;
//   options: Option[];
//   onChange: (value: string | number) => void;
//   placeholder?: string;
//   disabled?: boolean;
// }

// const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
//   value,
//   options,
//   onChange,
//   placeholder = "Select...",
//   disabled = false,
// }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");
//   // Track where the dropdown should appear on the screen
//   const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  
//   const containerRef = useRef<HTMLDivElement>(null);
//   const dropdownRef = useRef<HTMLDivElement>(null);

//   // Update position when opening or scrolling
//   const updatePosition = useCallback(() => {
//     if (containerRef.current) {
//       const rect = containerRef.current.getBoundingClientRect();
//       setCoords({
//         top: rect.bottom + window.scrollY,
//         left: rect.left + window.scrollX,
//         width: rect.width,
//       });
//     }
//   }, [])

//   useEffect(() => {
//     if (isOpen) {
//       updatePosition();

//       // 1. Close on Click Outside
//       const handleClickOutside = (event: MouseEvent) => {
//         if (
//           containerRef.current && 
//           !containerRef.current.contains(event.target as Node) &&
//           dropdownRef.current &&
//           !dropdownRef.current.contains(event.target as Node)
//         ) {
//           setIsOpen(false);
//         }
//       };

//       // 2. Close on Scroll (Fixes the floating issue)
//       const handleScroll = () => {
//         setIsOpen(false);
//       };

//       document.addEventListener("mousedown", handleClickOutside);
//       // Listen for scroll on the window AND any scrollable parents
//       window.addEventListener("scroll", handleScroll, true); 

//       return () => {
//         document.removeEventListener("mousedown", handleClickOutside);
//         window.removeEventListener("scroll", handleScroll, true);
//       };
//     }
//   }, [isOpen, updatePosition]);

//   const filteredOptions = options.filter((option) =>
//     option.label.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const selectedOption = options.find((opt) => String(opt.value) === String(value));

//   return (
//     <div className="relative w-full" ref={containerRef}>
//       <button
//         type="button"
//         disabled={disabled}
//         onClick={() => {
//           if (!disabled) {
//             updatePosition();
//             setIsOpen(!isOpen);
//             setSearchTerm("");
//           }
//         }}
//         className={`focus:border-primary flex w-full items-center justify-between border-b border-gray-300 bg-transparent px-1 py-1 text-left text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 ${
//           isOpen ? "border-primary" : ""
//         }`}
//       >
//         <span className="truncate">
//           {selectedOption ? selectedOption.label : placeholder}
//         </span>
//         <svg
//           className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
//           fill="none"
//           stroke="currentColor"
//           viewBox="0 0 24 24"
//         >
//           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
//         </svg>
//       </button>

//       {/* PORTAL STARTS HERE */}
//       {isOpen &&
//         createPortal(
//           <div
//             ref={dropdownRef}
//             style={{
//               position: "absolute",
//               top: coords.top,
//               left: coords.left,
//               width: coords.width,
//               zIndex: 9999, // Ensure it's above everything
//             }}
//             className="mt-1 flex flex-col rounded-md border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
//           >
//             <div className="p-2">
//               <input
//                 autoFocus
//                 type="text"
//                 placeholder="Search..."
//                 className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm outline-hidden dark:border-gray-700 dark:bg-meta-4"
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>
//             <div className="max-h-60 overflow-y-auto">
//               {filteredOptions.length > 0 ? (
//                 filteredOptions.map((option) => (
//                   <button
//                     key={option.value}
//                     type="button"
//                     className="hover:bg-gray-100 dark:hover:bg-meta-4 w-full px-4 py-2 text-left text-sm dark:text-gray-200"
//                     onClick={() => {
//                       onChange(option.value);
//                       setIsOpen(false);
//                     }}
//                   >
//                     {option.label}
//                   </button>
//                 ))
//               ) : (
//                 <div className="px-4 py-2 text-sm text-gray-500">No results found</div>
//               )}
//             </div>
//           </div>,
//           document.body // This renders the dropdown list at the end of the body
//         )}
//     </div>
//   );
// };

// export default SearchableDropdown;

//v1.3
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface Option {
  label: string;
  value: string | number;
}

interface SearchableDropdownProps {
  value: string;
  options: Option[];
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  value,
  options,
  onChange,
  placeholder = "Select...",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();

      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node) &&
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      // FIXED: Check scroll target before closing
      const handleScroll = (event: Event) => {
        if (
            dropdownRef.current && 
            event.target instanceof Node && 
            dropdownRef.current.contains(event.target)
        ) {
            return; // Allow scrolling inside the dropdown
        }
        setIsOpen(false); // Close if scrolling outside
      };

      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, true);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("scroll", handleScroll, true);
      };
    }
  }, [isOpen, updatePosition]);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            updatePosition();
            setIsOpen(!isOpen);
            setSearchTerm("");
          }
        }}
        className={`focus:border-primary flex w-full items-center justify-between border-b border-gray-300 bg-transparent px-1 py-1 text-left text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 ${
          isOpen ? "border-primary" : ""
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "absolute",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 9999,
            }}
            className="mt-1 flex flex-col rounded-md border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="p-2">
              <input
                autoFocus
                type="text"
                placeholder="Search..."
                className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm outline-hidden dark:border-gray-700 dark:bg-meta-4"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Added max-h and overflow here ensures the list is scrollable */}
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="hover:bg-gray-100 dark:hover:bg-meta-4 w-full px-4 py-2 text-left text-sm dark:text-gray-200"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">No results found</div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default SearchableDropdown;