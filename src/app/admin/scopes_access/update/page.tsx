"use client";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import FormScopesAccess from "@/components/FormElements/FormScopesAccess";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function Update_Scopes() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key");
  const [showHelp, setShowHelp] = useState(false);

  return (
    <DefaultLayout>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Breadcrumb
          pageName={key ? `Update Access for ${key}` : "Create New Access"}
          noHeader
        />
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {showHelp ? "Hide" : "Help"}
        </button>
      </div>
      {showHelp && (
        <div className="mb-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
          1st &amp; 2nd digit = Menu Section. 2nd digit &quot;0&quot; = All sub-menus. 3rd digit = Access level.
          Level 1 (top) covers all. Level 2 covers 3 &amp; 4. Level 3 covers 4. Level 4 = monitor only.
        </div>
      )}
      <FormScopesAccess />
    </DefaultLayout>
  );
}
