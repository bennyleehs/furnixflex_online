import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import ComingSoon from "@/components/DisplayPage/ComingSoon";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export default function SalesIndoor() {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Indoor" />
      <ComingSoon />
    </DefaultLayout>
  );
}
