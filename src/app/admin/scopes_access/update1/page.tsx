// app/admin/scopes_access/update/page.tsx
"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import FormScopesAccess from "@/components/FormElements/FormScopesAccess";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import { useSearchParams } from "next/navigation";

export default function Update_ScopesAccess() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key");

  return (
    <DefaultLayout>
      <Breadcrumb pageName={key ? `Update Access for ${key}` : "Create New Access"} />
      <FormScopesAccess />
    </DefaultLayout>
  );
}