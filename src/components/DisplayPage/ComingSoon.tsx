"use client";

import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Image from "next/image";
import useColorMode from "@/hooks/useColorMode";

const ComingSoon = () => {
    const [colorMode] = useColorMode()
    const logosrc = colorMode === 'dark' ? "/images/logo/classy_logo_gray.svg" : "/images/logo/classy_logo_ori.svg"
  return (
    // <DefaultLayout>
    //   <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark flex h-screen flex-col items-center justify-center rounded-lg border bg-white">
    //     <div className="w-full text-center">
    //       <div className="flex justify-center p-4 sm:p-8 xl:p-6">
    //         <Image
    //           width={400}
    //           height={200}
    //           src={logosrc}
    //           alt="Logo Classy Pro"
    //         />
    //       </div>
    //       <h1 className="mb-4 text-4xl font-bold text-black dark:text-white">
    //         Coming Soon
    //       </h1>
    //       <p className="mb-8 text-black dark:text-white">
    //         This page section under construction! Thank you for waiting.
    //       </p>
    //     </div>
    //   </div>
    // </DefaultLayout>
    
    // <DefaultLayout>
      <div className=" shadow-default border-strokedark bg-boxdark flex h-screen flex-col items-center justify-center rounded-lg border">
        <div className="w-full text-center">
          <div className="flex justify-center p-4 sm:p-8 xl:p-6">
            <Image
              width={400}
              height={200}
            //   src={logosrc}
              src={"/images/logo/classy_logo_gray.svg"}
              alt="Logo Classy Pro"
            />
          </div>
          <h1 className="mb-4 text-4xl font-bold text-primary">
            Coming Soon
          </h1>
          <p className="mb-8 text-white">
            This page section under construction! Thank you for waiting.
          </p>
        </div>
      </div>
    // </DefaultLayout>
  );
};

export default ComingSoon;
