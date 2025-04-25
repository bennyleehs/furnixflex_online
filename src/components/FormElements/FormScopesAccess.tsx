// scr/components/FormElements/FormScopesAccess.tsx
"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";

const FormScopesAccess = () => {
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  };
  return (
    <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-lg border bg-white px-5 pt-6 pb-2.5 sm:px-7.5 xl:pb-2">
      <form onSubmit={handleSubmit}>
        <div className="mb-6 grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-6">
            <label className="mb-3 block text-sm font-medium text-black dark:text-white">
              Key : Branch.Department.Role
            </label>
            <input
              type="text"
              //fetch Branch.Department.Role
              placeholder="Active & Disable Input"
              disabled
              className="border-primary focus:border-primary active:border-primary disabled:bg-whiter dark:bg-form-input w-full rounded-lg border-[1.5px] bg-transparent px-5 py-3 text-black outline-hidden transition disabled:cursor-default dark:text-white"
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <label className="mb-2.5 block font-medium text-black dark:text-white">
              Input
            </label>
            <div className="relative">
              <input
                type="text"
                // fetch from access_control.json and editable to json
                placeholder="Input"
                className="border-stroke focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary w-full rounded-lg border bg-transparent py-2 pr-10 pl-6 text-black outline-hidden focus-visible:shadow-none dark:text-white"
                disabled={false}
                // value={}
                // onChange={(e) => set?(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <div className="mb-1">
          <input
            type="submit"
            value="UPDATE"
            className="bg-primary hover:bg-primarydark w-30 cursor-pointer rounded-lg border p-4 font-semibold text-white transition hover:text-white"
          />
        </div>
        <div className="mt-2 text-center">
          {message && (
            <p
              className={`mt-2 ${
                isError ? "text-center text-red-500" : "text-green-500"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default FormScopesAccess;
