import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import ComingSoon from "@/components/DisplayPage/ComingSoon";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import QrCodeGenerator from '@/components/QrCodeGenerator';

export default function Invoices() {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Invoices" />

      <QrCodeGenerator />



    </DefaultLayout>
  );
}
