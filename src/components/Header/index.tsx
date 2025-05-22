import Link from "next/link";
import DarkModeSwitcher from "./DarkModeSwitcher";
import DropdownMessage from "./DropdownMessage";
import DropdownNotification from "./DropdownNotification";
import DropdownUser from "./DropdownUser";
import Image from "next/image";

const Header = (props: {
  sidebarOpen: string | boolean | undefined;
  setSidebarOpen: (arg0: boolean) => void;
}) => {
  return (
    <header className="drop-shadow-1 dark:bg-boxdark sticky top-0 z-999 flex w-full bg-white dark:drop-shadow-none">
      <div className="shadow-2 flex grow items-center justify-between px-4 py-4 md:px-6 2xl:px-8">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* <!-- Hamburger Toggle BTN --> */}
          <div className="flex items-center gap-2 sm:gap-4 lg:hidden">
            <button
              aria-controls="sidebar"
              onClick={(e) => {
                e.stopPropagation();
                props.setSidebarOpen(!props.sidebarOpen);
              }}
              className="border-stroke dark:border-strokedark dark:bg-boxdark z-99999 block rounded-xs border bg-white p-1.5 shadow-xs lg:hidden"
            >
              <span className="relative block h-5.5 w-5.5 cursor-pointer">
                <span className="du-block absolute right-0 h-full w-full">
                  <span
                    className={`relative top-0 left-0 my-1 block h-0.5 w-0 rounded-sm bg-black delay-0 duration-200 ease-in-out dark:bg-white ${
                      !props.sidebarOpen && "w-full! delay-300"
                    }`}
                  ></span>
                  <span
                    className={`relative top-0 left-0 my-1 block h-0.5 w-0 rounded-sm bg-black delay-150 duration-200 ease-in-out dark:bg-white ${
                      !props.sidebarOpen && "w-full! delay-400"
                    }`}
                  ></span>
                  <span
                    className={`relative top-0 left-0 my-1 block h-0.5 w-0 rounded-sm bg-black delay-200 duration-200 ease-in-out dark:bg-white ${
                      !props.sidebarOpen && "w-full! delay-500"
                    }`}
                  ></span>
                </span>
                <span className="absolute right-0 h-full w-full rotate-45">
                  <span
                    className={`absolute top-0 left-2.5 block h-full w-0.5 rounded-sm bg-black delay-300 duration-200 ease-in-out dark:bg-white ${
                      !props.sidebarOpen && "h-0! delay-0!"
                    }`}
                  ></span>
                  <span
                    className={`absolute top-2.5 left-0 block h-0.5 w-full rounded-sm bg-black delay-400 duration-200 ease-in-out dark:bg-white ${
                      !props.sidebarOpen && "h-0! delay-200!"
                    }`}
                  ></span>
                </span>
              </span>
            </button>
          </div>
          {/* <!-- Hamburger Toggle BTN --> */}

          <Link className="block shrink-0 lg:hidden" href="/">
            <Image
              width={32}
              height={32}
              src="/images/logo/classy_icon.svg"
              alt="Logo"
              className="block dark:hidden"
            />
            {/* Dark Mode Logo */}
            <Image
              width={32}
              height={32}
              src="/images/logo/classy_gray_icon.svg"
              alt="Logo"
              className="hidden dark:block"
            />
          </Link>
        </div>
        <div className="2xsm:gap-7 flex items-center gap-3">
          <ul className="2xsm:gap-4 flex items-center gap-2">
            {/* <!-- Dark Mode Toggler --> */}
            <DarkModeSwitcher />
            {/* <!-- Dark Mode Toggler --> */}

            {/* <!-- Notification Menu Area --> */}
            <DropdownNotification />
            {/* <!-- Notification Menu Area --> */}

            {/* <!-- Chat Notification Area --> */}
            {/* <DropdownMessage /> */}
            {/* <!-- Chat Notification Area --> */}
          </ul>

          {/* <!-- User Area --> */}
          <DropdownUser />
          {/* <!-- User Area --> */}
        </div>
      </div>
    </header>
  );
};

export default Header;
