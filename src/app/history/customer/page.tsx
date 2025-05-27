import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import ComingSoon from "@/components/DisplayPage/ComingSoon";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export default function HistoryCustomer() {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Customer" />
      <ComingSoon />
    </DefaultLayout>
  );
}
