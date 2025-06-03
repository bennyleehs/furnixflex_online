import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import ComingSoon from "@/components/DisplayPage/ComingSoon";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export default function FinanceReport() {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Finance Report" />
      <ComingSoon />
    </DefaultLayout>
  );
}
