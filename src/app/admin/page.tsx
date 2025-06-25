import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import ComingSoon from "@/components/DisplayPage/ComingSoon";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export default function Admin() {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Administration Menu" noHeader/>
      <ComingSoon />
    </DefaultLayout>
  );
}