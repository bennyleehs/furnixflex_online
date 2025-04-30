import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import FormScopes2 from "@/components/FormElements/FormScopes2";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export default function Update_Scopes() {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Update Scopes2 Access" />
      <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-4">
        <h2 className="mb-2 text-lg dark:text-black font-semibold">Instructions</h2>
        <p className="dark:text-black">
            {/* based on access_action.json */}
          {/* <span key={id} className="inline-block rounded bg-gray-100 px-2 py-1">
            {id}: {name}
          </span> */}
          The first and second digit represent the Menu Section.
          The third digit represent the access right.
          The second digit "0" - All sub-menu enable.
        </p>
        <p className="dark:text-black">Level 1 as top right of access, also covered the rest.
          Level 2 covered - Level 3, 4.
          Level 3 covered - Level 4.
          Level 4 only for monitoring.</p>
      </div>
      <FormScopes2 />
    </DefaultLayout>
  );
}
