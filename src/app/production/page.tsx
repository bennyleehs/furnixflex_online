import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import ComingSoon from "@/components/DisplayPage/ComingSoon";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export default function Production() {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Prodction Menu" noHeader/>
      <ComingSoon />
    </DefaultLayout>
  );
}