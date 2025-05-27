"use client";
import Image from "next/image";

const ComingSoon = () => {
  return (
    <div className="shadow-default bg-white border-stroke dark:border-strokedark dark:bg-boxdark flex h-screen flex-col items-center justify-center rounded-lg border">
      <div className="w-full text-center">
        <div className="flex justify-center p-4 sm:p-8 xl:p-6">
          <Image
            width={280}
            height={100}
            src={"/images/logo/classy_logo_ori.svg"}
            alt="Logo Classy Pro"
            className="block dark:hidden"
          />
          {/* Dark Mode Logo */}
          <Image
            width={280}
            height={100}
            src={"/images/logo/classy_logo_gray.svg"}
            alt="Logo Classy Pro"
            className="hidden dark:block"
          />
        </div>
        <h1 className="text-primary mb-4 text-4xl font-bold">Coming Soon</h1>
        <p className="mb-4 text-black dark:text-white">
          This page section is under construction! Thank you for waiting.
        </p>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          &copy; {new Date().getFullYear()} - Classy Project Marketing Sdn. Bhd.
        </p>
      </div>
    </div>
  );
};

export default ComingSoon;
