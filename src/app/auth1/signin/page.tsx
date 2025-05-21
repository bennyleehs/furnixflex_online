"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
// import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

// export const metadata: Metadata = {
//   title: "Next.js SignIn Page | Classy Pro System",
//   description: "This is Next.js Signin Page TailAdmin Dashboard Template",
// };

const SignIn = () => {
  const [uid, setUid] = useState("");
  const [password, setPwd] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, password }),
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response from server");
      }

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "Sign-in successful");
        setIsError(false);
        router.push("/"); //push home
      } else {
        setMessage(data.error || "Sign-in failed.");
        setIsError(true);
      }
    } catch (error) {
      setMessage("Something went wrong. Please try again later.");
      setIsError(true);
      console.error(error);
    }
  };

  return (
    <div className="flex h-screen items-center">
      <div className="mx-8 md:mx-auto md:p-6 2xl:p-10">
        <div className="rounded-lg border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="p-4 sm:p-8 xl:p-10">
            <Image
              width={400}
              height={10}
              src={"/images/logo/classy_logo_ori.svg"}
              alt="Logo Classy Pro"
            />

{/*            <h2 className="mb-5 text-2xl font-bold text-black dark:text-white sm:text-title-xl2">
              Welcome back!
            </h2>
*/}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="mb-2.5 block font-medium text-black dark:text-white">
                  User ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="UID"
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 pl-6 pr-10 text-black outline-hidden focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary uppercase"
                    disabled={false}
                    value={uid}
                    onChange={(e) => setUid(e.target.value)}
                    required
                  />
                  {/* <input
                    type="text"
                    className="peer w-full rounded-lg border border-stroke bg-transparent py-2 pl-6 pr-10 text-black outline-hidden focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary" // Added peer class
                    disabled={false}
                    value={uid}
                    onChange={(e) => setUid(e.target.value)}
                    required
                  />
                  <label
                    className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 transition-all peer-placeholder-shown:top-1/4 peer-placeholder-shown:text-base peer-focus:-translate-y-full peer-focus:text-sm peer-focus:text-primary dark:text-gray-400 dark:peer-focus:text-primary"
                    htmlFor="uid"
                  >
                    {" "}
                    {/* Added htmlFor and styling */}
                    {/* User ID */}
                  {/* </label> */} 

                  <span className="absolute right-4 top-2">
                    <svg
                      className="fill-current"
                      width="28"
                      height="28"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g opacity="0.5">
                        <path d="M8.749,9.934c0,0.247-0.202,0.449-0.449,0.449H4.257c-0.247,0-0.449-0.202-0.449-0.449S4.01,9.484,4.257,9.484H8.3C8.547,9.484,8.749,9.687,8.749,9.934 M7.402,12.627H4.257c-0.247,0-0.449,0.202-0.449,0.449s0.202,0.449,0.449,0.449h3.145c0.247,0,0.449-0.202,0.449-0.449S7.648,12.627,7.402,12.627 M8.3,6.339H4.257c-0.247,0-0.449,0.202-0.449,0.449c0,0.247,0.202,0.449,0.449,0.449H8.3c0.247,0,0.449-0.202,0.449-0.449C8.749,6.541,8.547,6.339,8.3,6.339 M18.631,4.543v10.78c0,0.248-0.202,0.45-0.449,0.45H2.011c-0.247,0-0.449-0.202-0.449-0.45V4.543c0-0.247,0.202-0.449,0.449-0.449h16.17C18.429,4.094,18.631,4.296,18.631,4.543 M17.732,4.993H2.46v9.882h15.272V4.993z M16.371,13.078c0,0.247-0.202,0.449-0.449,0.449H9.646c-0.247,0-0.449-0.202-0.449-0.449c0-1.479,0.883-2.747,2.162-3.299c-0.434-0.418-0.714-1.008-0.714-1.642c0-1.197,0.997-2.246,2.133-2.246s2.134,1.049,2.134,2.246c0,0.634-0.28,1.224-0.714,1.642C15.475,10.331,16.371,11.6,16.371,13.078M11.542,8.137c0,0.622,0.539,1.348,1.235,1.348s1.235-0.726,1.235-1.348c0-0.622-0.539-1.348-1.235-1.348S11.542,7.515,11.542,8.137 M15.435,12.629c-0.214-1.273-1.323-2.246-2.657-2.246s-2.431,0.973-2.644,2.246H15.435z"></path>
                      </g>
                    </svg>
                  </span>
                </div>
              </div>

              {/* <div>
                <input
                  className="bg- white peer w-full select-all rounded-md border border-gray-800 px-5 py-3 text-lg text-gray-600 outline-hidden transition-all"
                  type="text"
                  placeholder=" "
                />
                <label className="z-2 pointer-events-none absolute inset-y-0 left-5 m-0 flex h-fit -translate-y-1/2 select-none items-center bg-white px-1 text-sm text-gray-500 transition-all peer-placeholder-shown:m-auto peer-placeholder-shown:translate-y-0 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-placeholder-shown:text-lg peer-focus:m-0 peer-focus:-translate-y-1/2 peer-focus:bg-white peer-focus:px-1 peer-focus:text-sm">
                  Label
                </label>
              </div> */}

              <div className="mb-6">
                <label className="mb-2.5 block font-medium text-black dark:text-white">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="6+ Characters, 1 Capital 1 Symbol"
                    className="w-full rounded-lg border border-stroke bg-transparent py-2 pl-6 pr-10 text-black outline-hidden focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    disabled={false}
                    value={password}
                    onChange={(e) => setPwd(e.target.value)}
                    required
                  />

                  <span className="absolute right-4 top-2">
                    <svg
                      className="fill-current"
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g opacity="0.5">
                        <path
                          d="M16.1547 6.80626V5.91251C16.1547 3.16251 14.0922 0.825009 11.4797 0.618759C10.0359 0.481259 8.59219 0.996884 7.52656 1.95938C6.46094 2.92188 5.84219 4.29688 5.84219 5.70626V6.80626C3.84844 7.18438 2.33594 8.93751 2.33594 11.0688V17.2906C2.33594 19.5594 4.19219 21.3813 6.42656 21.3813H15.5016C17.7703 21.3813 19.6266 19.525 19.6266 17.2563V11C19.6609 8.93751 18.1484 7.21876 16.1547 6.80626ZM8.55781 3.09376C9.31406 2.40626 10.3109 2.06251 11.3422 2.16563C13.1641 2.33751 14.6078 3.98751 14.6078 5.91251V6.70313H7.38906V5.67188C7.38906 4.70938 7.80156 3.78126 8.55781 3.09376ZM18.1141 17.2906C18.1141 18.7 16.9453 19.8688 15.5359 19.8688H6.46094C5.05156 19.8688 3.91719 18.7344 3.91719 17.325V11.0688C3.91719 9.52189 5.15469 8.28438 6.70156 8.28438H15.2953C16.8422 8.28438 18.1141 9.52188 18.1141 11V17.2906Z"
                          fill=""
                        />
                        <path
                          d="M10.9977 11.8594C10.5852 11.8594 10.207 12.2031 10.207 12.65V16.2594C10.207 16.6719 10.5508 17.05 10.9977 17.05C11.4102 17.05 11.7883 16.7063 11.7883 16.2594V12.6156C11.7883 12.2031 11.4102 11.8594 10.9977 11.8594Z"
                          fill=""
                        />
                      </g>
                    </svg>
                  </span>
                </div>
              </div>

              <div className="mb-1">
                <input
                  type="submit"
                  value="LOG IN"
                  // className="w-full cursor-pointer rounded-lg border-2 border-primary p-4 font-semibold text-primary transition hover:bg-primary hover:text-white"
                  className="w-full cursor-pointer rounded-lg border bg-primary p-4 font-semibold text-white transition hover:bg-primarydark hover:text-white"
                />
              </div>

              <div className="mt-2 text-center">
                {message && (
                  <p
                    className={`mt-2 ${
                      isError ? "text-center text-red-500" : "text-green-500"
                    }`}
                  >
                    {message}
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
