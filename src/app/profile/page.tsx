//src/app/profile/page.tsx
"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import Image from "next/image";
import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import { useAuth } from "@/context/AuthContext";
import ComingSoon from "@/components/DisplayPage/ComingSoon";

interface Users {}

const Profile = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle profile photo upload
  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <DefaultLayout>
      <div>
        <Breadcrumb pageName="Profile" noHeader={true} />

        <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-lg border bg-white">
          <div className="border-stroke dark:border-strokedark border-b p-6">
            <div className="flex flex-col gap-6 md:flex-row">
              <div className="flex flex-col items-center">
                <div className="dark:border-boxdark relative mb-3 h-32 w-32 overflow-hidden rounded-full border-4 border-gray-100">
                  {/* {users?.profilePhoto ? ( */}
                  {/* {users?.profilePhoto? (
                    <Image
                      src={users.profilePhoto}
                      alt={users.name}
                      fill
                      className="object-cover"
                    />
                  ) : ( */}
                  <div className="dark:bg-meta-4 flex h-full w-full items-center justify-center bg-gray-200">
                    {/* people icon */}
                    <svg
                      className="h-16 w-16 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </div>
                  {/* )} */}

                  {/* Upload overlay */}
                  <div
                    className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100"
                    onClick={handlePhotoUpload}
                  >
                    <svg
                      className="h-8 w-8 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </div>

                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white"></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1">
                {/* <h3 className="mb-1.5 text-2xl font-semibold text-black dark:text-white">
                  {user?.name}
                </h3>
                <p className="font-medium">{user?.department || "None"}</p> */}

                <h2 className="mb-1 text-2xl font-bold text-gray-800 dark:text-white">
                  {user?.name}
                </h2>
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>UID: {user?.uid}</span>
                  <span className="h-1 w-1 rounded-full bg-gray-500 dark:bg-gray-400"></span>
                  <span>{user?.name}</span>
                  <span className="h-1 w-1 rounded-full bg-gray-500 dark:bg-gray-400"></span>
                  <span>
                    Status:
                    {/* <span
                          className={`ml-1 rounded-full px-2 py-1 font-medium ${
                            users.status === "Active"
                              ? "text-success dark:bg-success/60 bg-green-200/60 dark:text-green-100"
                              : users.status === "Inactive"
                                ? "text-warning bg-warning/20 dark:bg-warning/60 dark:text-yellow-100"
                                : "text-danger bg-danger/20 dark:bg-danger/60 dark:text-red-200"
                          }`}
                        >
                          {users.status}
                        </span> */}
                  </span>
                </div>
              </div>

              <div className="flex w-full justify-center md:w-auto">
                <button
                  // onClick={() => setIsChangePasswordModalOpen(true)}
                  className="dark:bg-meta-4 dark:border-strokedark dark:hover:bg-primary hover:border-primary hover:text-primary inline-flex h-10 w-full items-center justify-center rounded-md border border-gray-300 bg-gray-50 px-2 py-2 text-gray-700 md:w-auto md:px-4 dark:text-white dark:hover:text-white"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    ></path>
                  </svg>
                  Change Password
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <h3 className="mb-1.5 text-2xl font-semibold text-black dark:text-white">
              {user?.name}
            </h3>
            {/* <p className="font-medium">{user?.uid || "None"}</p> */}
            <p className="font-medium">Employee&apos;s Information</p>
          </div>
        </div>
        <div className="p-4"></div>
        <ComingSoon/>
      </div>
    </DefaultLayout>
  );
};

export default Profile;
