import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import ComingSoon from "@/components/DisplayPage/ComingSoon";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export default function Inventory() {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Inventory Stock" />
      <ComingSoon />
    </DefaultLayout>
  );
}
