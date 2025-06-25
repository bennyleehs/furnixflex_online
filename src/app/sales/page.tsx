import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import ComingSoon from "@/components/DisplayPage/ComingSoon";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export default function Sales() {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Sales Menu" noHeader/>
      <ComingSoon />
    </DefaultLayout>
  );
}