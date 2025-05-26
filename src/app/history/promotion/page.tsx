import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import ComingSoon from "@/components/DisplayPage/ComingSoon";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export default function HistoryPromotion() {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="History Promo" />
      <ComingSoon />
    </DefaultLayout>
  );
}
