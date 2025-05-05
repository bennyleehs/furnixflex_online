// scr/components/FormElements/FormScopesAccess.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect } from "react";
import SelectDropdown from "@/components/SelectGroup/SelectDropdown";
import sidebarMenu from "@/data/sidebar_menu.json"; // Import your JSON data
import { MenuItem, SidebarMenu } from "@/types/sidebarMenu"; // Import the type

const FormScopes2Access = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const key = searchParams.get("key");

  const [accessPaths, setAccessPaths] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  // Explicitly type sidebarMenu
  const typedSidebarMenu = sidebarMenu as SidebarMenu;

  // Filter the menu items to exclude the ones you want to ignore
  const filteredMenuItems = typedSidebarMenu.reduce<MenuItem[]>(
    (acc, section) => {
      const filteredItems = section.menuItems.filter(
        (item) =>
          item.label !== "Dashboard" &&
          item.label !== "Country & Currency" &&
          item.label !== "Settings",
      );
      return [...acc, ...filteredItems];
    },
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    // e.preventDefault();
  };

  return (
    <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-lg border bg-white px-5 pt-6 pb-2.5 sm:px-7.5 xl:pb-2">
      <form onSubmit={handleSubmit}>
        <div className="my-2 grid md:grid-cols-3">
          <div className="my-2 md:grid md:grid-cols-2">
            <label className="my-auto font-medium text-black dark:text-white">
              Branch - Department - Role
            </label>
            <input
              type="text"
              placeholder="JB.TECHNOLOGY.Supervisor"
              disabled
              className="border-primary active:border-primary disabled:bg-whiter dark:bg-form-input w-full rounded-lg border-[1.5px] bg-transparent px-5 py-3 text-black outline-hidden transition disabled:cursor-default md:w-80 dark:text-white"
            />
          </div>

          <div className="mx-auto my-auto grid grid-cols-3 gap-2 md:col-start-2">
            <div className="border-primary bg-whiter dark:bg-form-input flex aspect-square w-14 items-center justify-center rounded-lg border">
              <span className="text-black dark:text-white">1</span>
            </div>
            <div className="border-primary bg-whiter dark:bg-form-input flex aspect-square w-14 items-center justify-center rounded-lg border">
              <span className="text-black dark:text-white">0</span>
            </div>
            <div className="border-primary bg-whiter dark:bg-form-input flex aspect-square w-14 items-center justify-center rounded-lg border">
              <span className="text-black dark:text-white">1</span>
            </div>
          </div>
        </div>
        <div className="my-6 grid grid-cols-3">
          {filteredMenuItems.map((menuItem, index) => (
            <div className="grid" key={index}>
              <label className="mb-3 block font-bold text-black dark:text-white">
                {menuItem.label}
              </label>
              <div className="relative mb-6">
                <SelectDropdown />
              </div>
            </div>
          ))}
        </div>
        <div className="mb-1 flex space-x-4">
          <input
            type="submit"
            value="UPDATE"
            className="bg-primary hover:bg-primarydark cursor-pointer rounded-lg border p-4 font-semibold text-white transition hover:text-white"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => router.push("/admin/scopes_access")}
            className="rounded-lg border border-gray-300 bg-gray-100 p-4 font-semibold text-gray-700 transition hover:bg-gray-200"
          >
            CANCEL
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormScopes2Access;
