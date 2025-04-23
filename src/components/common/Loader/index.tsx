import Image from "next/image";

const Loader = () => {
  return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-black">
      <div className="h-max w-max animate-spin rounded-full ">
      {/* <div className="h-16 w-max animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"> */}
        <Image
          src={"/images/logo/classy_icon.svg"}
          alt={"Classy Pro Icon"}
          width={80}
          height={80}
        />
      </div>
    </div>
  );
};

export default Loader;
