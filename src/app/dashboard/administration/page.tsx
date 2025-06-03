import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import ComingSoon from "@/components/DisplayPage/ComingSoon";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export default function AdminReport() {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Admin Report" />
      <ComingSoon />
    </DefaultLayout>
  );
}
