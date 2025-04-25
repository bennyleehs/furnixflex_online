// app/admin/scopes_access/update/page.tsx
"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import FormScopesAccess from "@/components/FormElements/FormScopesAccess";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export default function Update_ScopessAccess() {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Update Scopess Access" />
      <FormScopesAccess />
    </DefaultLayout>
  );
}
