import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import ComingSoon from "@/components/DisplayPage/ComingSoon";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export default function Finance() {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Finance Menu" noHeader/>
      <ComingSoon />
    </DefaultLayout>
  );
}