import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import ComingSoon from "@/components/DisplayPage/ComingSoon";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export default function HistoryTask() {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="History Task" />
      <ComingSoon />
    </DefaultLayout>
  );
}
