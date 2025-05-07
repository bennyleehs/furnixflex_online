"use client";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import FormScopes2 from "@/components/FormElements/FormScopes2";
import { useSearchParams } from "next/navigation";

export default function Update_Scopes() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key");
  return (
    <DefaultLayout>
      <Breadcrumb
        pageName={key ? `Update Access for ${key}` : "Create New Access"}
      />
      <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-4">
        <h2 className="mb-2 text-lg font-semibold dark:text-black">
          Instructions
        </h2>
        <p className="dark:text-black">
          The first and second digit represent the Menu Section. The second
          digit "0" - All sub-menu enable. The third digit represent the access
          right.
        </p>
        <p className="dark:text-black">
          Level 1 as top right of access, also covered the rest. Level 2 covered
          the Level 3, 4. Level 3 covered the Level 4. Level 4 only for
          monitoring.
        </p>
      </div>
      <FormScopes2 />
    </DefaultLayout>
  );
}
