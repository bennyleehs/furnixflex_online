import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import ComingSoon from "@/components/DisplayPage/ComingSoon";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export default function CountryCurrency() {
    return (
       <DefaultLayout>
        <Breadcrumb pageName="Country & Currency"/>
        <ComingSoon/>
        </DefaultLayout>
    );
}