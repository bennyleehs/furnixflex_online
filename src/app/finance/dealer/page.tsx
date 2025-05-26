import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import ComingSoon from "@/components/DisplayPage/ComingSoon";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export default function Dealer() {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Dealer" />
      <ComingSoon />
    </DefaultLayout>
  );
}
