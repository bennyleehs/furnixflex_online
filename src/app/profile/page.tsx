//src/app/profile/page.tsx
"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import Image from "next/image";
import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import { useAuth } from "@/context/AuthContext";

interface Users {
  id: number;
  uid: string;
  name: string;
  nric: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  country: string;
  bank_name: string;
  bank_account: string;
  branchRef: string;
  deptRef?: string;
  branchName: string;
  deptName: string;
  roleName: string;
  status: string;
  profilePhoto?: string;
}

interface Document {
  id: number;
  name: string;
  type: string;
  size: number;
  uploadDate: string;
  url: string;
}

const Profile = () => {
  const { user, updateProfileImage } = useAuth(); //hook
  const searchParams = useSearchParams();
  const router = useRouter();
  const [users, setUsers] = useState<Users | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // Add state to track active tab
  const [activeTab, setActiveTab] = useState<"details" | "documents">(
    "details",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add these state variables with your other state declarations
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
    useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // doc
  const documentInputRef = useRef<HTMLInputElement>(null);
  // Add a ref for the documents section
  const documentsSectionRef = useRef<HTMLDivElement>(null);
  // Add a ref for the very top of your content
  const topRef = useRef<HTMLDivElement>(null);

  const toggleNewPwdVisibility = () => setShowNewPwd((prev) => !prev);
  const toggleConfirmPwdVisibility = () => setShowConfirmPwd((prev) => !prev);

  // Handle change password
  const handleChangePassword = async () => {
    // Reset errors
    setPasswordError(null);

    // Step 1: Check if passwords match
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    // Step 2: Validate password requirements
    if (!newPassword) {
      setPasswordError("New password is required");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }

    // Additional password strength validation (optional)
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(newPassword)) {
      setPasswordError(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      );
      return;
    }

    // Step 3: Passwords match and meet requirements - proceed with API call
    try {
      setIsChangingPassword(true);

      const response = await fetch("/api/profile/changePassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // employeeId: employee?.id,
          // employeeUid: employee?.uid,
          userId: users?.id,
          userUid: users?.uid,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Failed to change password: ${response.statusText}`,
        );
      }

      // Step 4: Success - reset form and close modal
      setNewPassword("");
      setConfirmPassword("");
      setIsChangePasswordModalOpen(false);

      // Show success message
      setSuccessMessage("Password changed successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Password change error:", err);
      setPasswordError(
        "Error changing password: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Tab switch
  // Update the function to handle tab switching and scrolling
  const handleTabChange = (tab: "details" | "documents") => {
    setActiveTab(tab);

    if (tab === "details") {
      // Try multiple approaches to find the right scrollable container

      // 1. Try finding common dashboard layout containers
      const contentArea =
        document.querySelector(".main") ||
        document.querySelector(".content-main") ||
        document.querySelector(".main-content") ||
        document.querySelector(".layout-content") ||
        document.getElementById("content");

      if (contentArea) {
        // Ensure we're scrolling to absolute top with a small delay
        setTimeout(() => {
          contentArea.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        }, 10);
      } else {
        // 2. Try scrolling the document body and html element (works in more browsers)
        document.body.scrollTo({ top: 0, behavior: "smooth" });
        document.documentElement.scrollTo({ top: 0, behavior: "smooth" });

        // 3. Fallback to traditional window scrolling
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      // 4. As final fallback, try to use the topRef directly
      setTimeout(() => {
        topRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    } else if (tab === "documents") {
      documentsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Handle profile photo upload
  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  // Fixed uploadProfilePhoto function
  const uploadProfilePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !users) return;

    try {
      setUploading(true);
      setUploadError(null);

      // Create form data for upload
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("usersId", users.id.toString());
      formData.append("usersUid", users.uid);

      // Call API using the combined endpoint
      const response = await fetch("/api/profile/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
      console.error("Server response text:", errorText);
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to upload photo: ${errorData.message || response.statusText}`,
        );
      }

      const data = await response.json();

      // Create the profile photo URL with cache busting
      // const profilePhotoUrl = `/admin/employee/${users.uid}/upload/profileImage${users.uid}.jpg?v=${Date.now()}`;
      const profilePhotoUrl = data.profilePhotoUrl;

      // CRITICAL FIX: Add a small delay to prevent the race condition
      setTimeout(() => {
      // Update employee state with new photo URL
      setUsers({
        ...users,
        profilePhoto: profilePhotoUrl,
      });

      // Use the user from the hook that was called at the top level
      if (user && user.uid === users.uid) {
        updateProfileImage(profilePhotoUrl);
      }

      setSuccessMessage("Profile photo updated successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
      setUploading(false);//move here
      }, 500); // Wait for 500ms (0.5 seconds)
    } catch (err) {
      console.error("Upload error details:", err);
      setUploadError(
        "Error uploading photo: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } 
    // finally {
    //   setUploading(false);//move up
    // }
  };

  // Handle document upload
  const handleDocumentUpload = () => {
    documentInputRef.current?.click();
  };

  // Update uploadDocument function
  const uploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !users) return;

    try {
      setUploading(true);
      setUploadError(null);

      // Create form data for upload
      const formData = new FormData();
      formData.append("document", file); // Note: still using 'document' key
      formData.append("usersId", users.id.toString());
      formData.append("usersUid", users.uid);

      // Call API using the new combined endpoint
      const response = await fetch("/api/profile/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to upload document: ${errorData.message || response.statusText}`,
        );
      }

      const data = await response.json();

      // Create a new document entry with the returned URL
      const newDocument: Document = {
        id: Date.now(),
        name: file.name,
        type: file.type,
        size: file.size,
        uploadDate: new Date().toISOString().split("T")[0],
        url: data.documentUrl,
      };

      // Update documents list
      setDocuments([...documents, newDocument]);

      setSuccessMessage("Document uploaded successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Upload error details:", err);
      setUploadError(
        "Error uploading document: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setUploading(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Delete document
  const deleteDocument = async (docId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      setUploading(true);

      const response = await fetch("/api/profile/upload", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usersUid: users?.uid,
          documentId: docId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to delete document: ${errorData.message || response.statusText}`,
        );
      }

      // Update documents list
      setDocuments(documents.filter((doc) => doc.id !== docId));

      setSuccessMessage("Document deleted successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Delete error details:", err);
      setUploadError(
        "Error deleting document: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setUploading(false);
    }
  };

  // Fetch users data
  useEffect(() => {
    const fetchUsersData = async () => {
      try {
        setLoading(true);
        const id = searchParams.get("id");
        const uid = searchParams.get("uid");

        if (!id && !uid) {
          throw new Error("Users ID or UID is required");
        }

        // Determine which parameter to use for the API call
        const queryParam = uid ? `uid=${uid}` : `id=${id}`;
        const res = await fetch(`/api/profile?${queryParam}`);

        if (!res.ok) {
          throw new Error("Failed to fetch employee data");
        }

        const data = await res.json();
        setUsers(data);
        console.log("Fetched user data:", data);

        // Fetch documents for this user
        if (data.uid) {
          const docsRes = await fetch(
            // `/api/admin/employee/upload?employeeUid=${data.uid}`,
            `/api/profile/upload?usersUid=${data.uid}`,
          );
          if (docsRes.ok) {
            const docsData = await docsRes.json();
            setDocuments(docsData.documents || []);

            // If there's a profile photo and the user doesn't have one set, update it
            if (docsData.profilePhoto && !data.profilePhoto) {
              setUsers({
                ...data,
                profilePhoto: docsData.profilePhoto,
              });
            }
          }
        }

        if (data.profilePhoto) {
          // Force reload of profile image by appending timestamp
          setUsers({
            ...data,
            profilePhoto: `${data.profilePhoto}${data.profilePhoto.includes("?") ? "&" : "?"}t=${Date.now()}`,
          });
        }
      } catch (err) {
        setError(
          "Error fetching user data: " +
            (err instanceof Error ? err.message : String(err)),
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsersData();
  }, [searchParams]);

  return (
    <DefaultLayout>
      <div>
        <Breadcrumb pageName="Profile" noHeader={true} />

        {/* Success message */}
        {successMessage && (
          <div className="mb-4 flex items-center justify-between rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)}>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </button>
          </div>
        )}

        <div ref={topRef} className="flex flex-col gap-5">
          {/* Error state */}
          {error && (
            <div className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {/* Upload error */}
          {uploadError && (
            <div className="mb-4 flex items-center justify-between rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
              <span>{uploadError}</span>
              <button onClick={() => setUploadError(null)}>
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
            </div>
          )}

          {!loading && !error && users && (
            <div className="border-stroke shadow-default dark:border-strokedark dark:bg-boxdark rounded-lg border bg-white">
              <div className="border-stroke border-b p-6 dark:border-white">
                <div className="flex flex-col gap-6 md:flex-row">
                  <div className="flex flex-col items-center">
                    <div className="dark:border-boxdark relative mb-3 h-32 w-32 overflow-hidden rounded-full border-4 border-gray-100">
                      {users?.profilePhoto ? (
                        <Image
                          src={`${users.profilePhoto.includes("?") ? users.profilePhoto : `${users.profilePhoto}?v=${Date.now()}`}`}
                          alt={users.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
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
                      )}

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
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={uploadProfilePhoto}
                    />
                  </div>
                  {/* User Info */}
                  <div className="flex-1">
                    <h2 className="mb-1 text-2xl font-bold text-gray-800 dark:text-white">
                      {users?.name}
                    </h2>
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
                      <span>UID: {users?.uid}</span>
                      <span className="h-1 w-1 rounded-full bg-gray-500 dark:bg-gray-400"></span>
                      <span>{users?.roleName}</span>
                      <span className="h-1 w-1 rounded-full bg-gray-500 dark:bg-gray-400"></span>
                      <span>
                        Status:
                        <span
                          className={`ml-1 rounded-full px-2 py-1 font-medium ${
                            users?.status === "Active"
                              ? "text-success dark:bg-success/60 bg-green-200/60 dark:text-green-100"
                              : users?.status === "Inactive"
                                ? "text-warning bg-warning/20 dark:bg-warning/60 dark:text-yellow-100"
                                : "text-danger bg-danger/20 dark:bg-danger/60 dark:text-red-200"
                          }`}
                        >
                          {users?.status}
                        </span>
                      </span>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {users?.email && (
                        <div className="flex items-center text-sm">
                          <svg
                            className="mr-1 h-4 w-4 text-gray-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                          </svg>
                          {users?.email}
                        </div>
                      )}

                      {users?.phone && (
                        <div className="flex items-center text-sm">
                          <svg
                            className="mr-1 h-4 w-4 text-gray-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path>
                          </svg>
                          {users?.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Change Password button */}
                  <div className="flex w-full justify-center md:w-auto">
                    <button
                      onClick={() => setIsChangePasswordModalOpen(true)}
                      className="dark:bg-meta-4 dark:border-strokedark dark:hover:bg-primary hover:border-primary hover:text-primary inline-flex h-[42px] w-full items-center justify-center rounded-md border border-gray-300 bg-gray-50 px-2 py-2 text-gray-700 md:w-auto md:px-4 dark:text-white dark:hover:text-white"
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
              {/* User Info section */}
              {/* <div className="p-6">
            <h3 className="mb-1.5 text-2xl font-semibold text-black dark:text-white">
              {users?.name}
            </h3>
            <p className="font-medium">{user?.uid || "None"}</p>
            <p className="font-medium">User&apos;s Information</p>
          </div> */}
              <div className="p-6">
                <div className="mb-6">
                  <div className="border-stroke dark:border-strokedark border-b">
                    <ul className="-mb-px flex flex-wrap">
                      <li className="mr-2">
                        <button
                          onClick={() => handleTabChange("details")}
                          className={`inline-block border-b-2 px-4 py-2 font-medium ${
                            activeTab === "details"
                              ? "border-primary text-primary"
                              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                          }`}
                        >
                          User Profile
                        </button>
                      </li>
                      <li className="mr-2">
                        <button
                          onClick={() => handleTabChange("documents")}
                          className={`inline-block border-b-2 px-4 py-2 font-medium ${
                            activeTab === "documents"
                              ? "border-primary text-primary"
                              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                          }`}
                        >
                          Documents
                          <span className="dark:bg-meta-4 ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                            {documents.length}
                          </span>
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Employee Details Section - Remove the ref from here */}
                <div className="mb-8 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* Personal Details */}
                  <div>
                    <h3 className="mb-2 text-xs font-medium text-gray-600 uppercase dark:text-gray-400">
                      Personal Details
                    </h3>
                    <ul className="space-y-1">
                      <li className="flex">
                        <span className="w-24 text-sm text-gray-500 dark:text-gray-400">
                          NRIC:
                        </span>
                        <span className="text-sm text-black dark:text-white">
                          {users?.nric || "-"}
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Company Details */}
                  <div>
                    <h3 className="mb-2 text-xs font-medium text-gray-600 uppercase dark:text-gray-400">
                      Company Details
                    </h3>
                    <ul className="space-y-1">
                      <li className="flex">
                        <span className="w-24 text-sm text-gray-500 dark:text-gray-400">
                          Branch:
                        </span>
                        <span className="text-sm text-black dark:text-white">
                          {users?.branchName || "-"}
                        </span>
                      </li>
                      <li className="flex">
                        <span className="w-24 text-sm text-gray-500 dark:text-gray-400">
                          Department:
                        </span>
                        <span className="text-sm text-black dark:text-white">
                          {users?.deptName || "-"}
                        </span>
                      </li>
                      <li className="flex">
                        <span className="w-24 text-sm text-gray-500 dark:text-gray-400">
                          Role:
                        </span>
                        <span className="text-sm text-black dark:text-white">
                          {users?.roleName || "-"}
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Banking Details */}
                  <div>
                    <h3 className="mb-2 text-xs font-medium text-gray-600 uppercase dark:text-gray-400">
                      Banking Details
                    </h3>
                    <ul className="space-y-1">
                      <li className="flex">
                        <span className="w-24 text-sm text-gray-500 dark:text-gray-400">
                          Bank:
                        </span>
                        <span className="text-sm text-black dark:text-white">
                          {users?.bank_name || "-"}
                        </span>
                      </li>
                      <li className="flex">
                        <span className="w-24 text-sm text-gray-500 dark:text-gray-400">
                          Account:
                        </span>
                        <span className="text-sm text-black dark:text-white">
                          {users?.bank_account || "-"}
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Address Information - spans full width */}
                  <div className="lg:col-span-3">
                    <h3 className="mb-2 text-xs font-medium text-gray-600 uppercase dark:text-gray-400">
                      Address
                    </h3>
                    <ul className="space-y-1">
                      <li className="flex flex-col sm:flex-row">
                        <span className="w-24 text-sm text-gray-500 sm:w-24 dark:text-gray-400">
                          Line 1:
                        </span>
                        <span className="text-sm text-black dark:text-white">
                          {users?.address_line1 || "-"}
                        </span>
                      </li>
                      {users?.address_line2 && (
                        <li className="flex flex-col sm:flex-row">
                          <span className="w-24 text-sm text-gray-500 sm:w-24 dark:text-gray-400">
                            Line 2:
                          </span>
                          <span className="text-sm text-black dark:text-white">
                            {users?.address_line2}
                          </span>
                        </li>
                      )}
                      <li className="flex flex-wrap gap-x-4">
                        <div className="flex">
                          <span className="w-24 text-sm text-gray-500 dark:text-gray-400">
                            City:
                          </span>
                          <span className="text-sm text-black dark:text-white">
                            {users?.city || "-"}
                          </span>
                        </div>
                        <div className="flex">
                          <span className="w-24 text-sm text-gray-500 dark:text-gray-400">
                            State:
                          </span>
                          <span className="text-sm text-black dark:text-white">
                            {users?.state || "-"}
                          </span>
                        </div>
                        <div className="flex">
                          <span className="w-24 text-sm text-gray-500 dark:text-gray-400">
                            Country:
                          </span>
                          <span className="text-sm text-black dark:text-white">
                            {users?.country || "-"}
                          </span>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Documents Section - Always visible with ref for scrolling */}
                <div
                  ref={documentsSectionRef}
                  className="border-stroke dark:border-strokedark mt-6 border-t pt-6"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                      Documents
                    </h3>

                    <button
                      onClick={handleDocumentUpload}
                      className="dark:bg-meta-4 dark:border-strokedark dark:hover:bg-primary hover:border-primary hover:text-primary inline-flex items-center justify-center rounded-md border border-gray-300 bg-gray-50 px-2 py-2 text-gray-700 md:px-4 dark:text-white dark:hover:text-white"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-500 dark:border-white"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg
                            className="mr-2 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 4v16m8-8H4"
                            ></path>
                          </svg>
                          Upload Document
                        </>
                      )}
                    </button>

                    {/* Hidden document input */}
                    <input
                      type="file"
                      ref={documentInputRef}
                      className="hidden"
                      onChange={uploadDocument}
                    />
                  </div>

                  {/* Documents list */}
                  {documents.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      No documents found. Upload a document to get started.
                    </div>
                  ) : (
                    <div className="divide-stroke dark:divide-strokedark divide-y">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between py-4"
                        >
                          <div className="flex items-center">
                            {/* Document icon based on type */}
                            <div className="dark:bg-meta-4 mr-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                              {doc.type.includes("pdf") ? (
                                <svg
                                  className="text-danger h-6 w-6"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              ) : doc.type.includes("word") ||
                                doc.type.includes("document") ? (
                                <svg
                                  className="text-primary h-6 w-6"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              ) : doc.type.includes("image") ? (
                                <svg
                                  className="text-success h-6 w-6"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="h-6 w-6 text-gray-400"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>

                            <div>
                              <h4 className="text-sm font-medium text-black dark:text-white">
                                {doc.name}
                              </h4>
                              <div className="mt-1 flex items-center text-xs text-gray-500">
                                <span>{formatFileSize(doc.size)}</span>
                                <span className="mx-2">•</span>
                                <span>Uploaded {doc.uploadDate}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="dark:text-primary dark:hover:text-primary/80 text-blue-600 hover:text-blue-800"
                              title="View document"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </a>

                            <a
                              href={doc.url}
                              download={doc.name}
                              className="dark:text-primary dark:hover:text-primary/80 text-blue-600 hover:text-blue-800"
                              title="Download document"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                />
                              </svg>
                            </a>

                            <button
                              onClick={() => deleteDocument(doc.id)}
                              className="text-danger hover:text-danger/80"
                              title="Delete document"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/50">
          <div className="dark:bg-boxdark mx-4 w-full max-w-md rounded-sm bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Change Password
              </h3>
              <button
                onClick={() => {
                  setIsChangePasswordModalOpen(false);
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordError(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </button>
            </div>

            {passwordError && (
              <div className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
                {passwordError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPwd ? "text" : "password"} // Use state for type
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="border-stroke focus:border-primary dark:border-strokedark dark:focus:border-primary w-full rounded-md border bg-transparent px-4 py-3 text-black outline-none focus-visible:shadow-none dark:text-white"
                    placeholder="Enter new password"
                  />
                  <span
                    className="absolute top-2 right-3 cursor-pointer"
                    onClick={toggleNewPwdVisibility}
                  >
                    {showNewPwd ? (
                      // "eye closed"
                      <svg
                        width="22"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M22 12C22 12 21.3082 13.3317 20 14.8335M10 5.23552C10.3244 5.15822 10.6578 5.09828 11 5.05822C11.3254 5.02013 11.6588 5 12 5C14.8779 5 17.198 6.43162 18.8762 8M12 9C12.3506 9 12.6872 9.06015 13 9.17071C13.8524 9.47199 14.528 10.1476 14.8293 11C14.9398 11.3128 15 11.6494 15 12M3 3L21 21M12 15C11.6494 15 11.3128 14.9398 11 14.8293C10.1476 14.528 9.47202 13.8524 9.17073 13C9.11389 12.8392 9.07037 12.6721 9.0415 12.5M4.14701 9C3.83877 9.34451 3.56234 9.68241 3.31864 10C2.45286 11.1282 2 12 2 12C2 12 5.63636 19 12 19C12.3412 19 12.6746 18.9799 13 18.9418"
                          stroke="currentColor"
                        />
                      </svg>
                    ) : (
                      // "eye open"
                      <svg
                        width="22"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M22 12C22 12 18.3636 19 12 19C5.63636 19 2 12 2 12C2 12 5.63636 5 12 5C14.8779 5 17.198 6.43162 18.8762 8M9 12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9"
                          stroke="currentColor"
                        />
                      </svg>
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPwd ? "text" : "password"} // Use state for type
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="border-stroke focus:border-primary dark:border-strokedark dark:focus:border-primary w-full rounded-md border bg-transparent px-4 py-3 text-black outline-none focus-visible:shadow-none dark:text-white"
                    placeholder="Confirm new password"
                  />
                  <span
                    className="absolute top-2 right-3 cursor-pointer"
                    onClick={toggleConfirmPwdVisibility}
                  >
                    {showConfirmPwd ? (
                      // "eye closed"
                      <svg
                        width="22"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M22 12C22 12 21.3082 13.3317 20 14.8335M10 5.23552C10.3244 5.15822 10.6578 5.09828 11 5.05822C11.3254 5.02013 11.6588 5 12 5C14.8779 5 17.198 6.43162 18.8762 8M12 9C12.3506 9 12.6872 9.06015 13 9.17071C13.8524 9.47199 14.528 10.1476 14.8293 11C14.9398 11.3128 15 11.6494 15 12M3 3L21 21M12 15C11.6494 15 11.3128 14.9398 11 14.8293C10.1476 14.528 9.47202 13.8524 9.17073 13C9.11389 12.8392 9.07037 12.6721 9.0415 12.5M4.14701 9C3.83877 9.34451 3.56234 9.68241 3.31864 10C2.45286 11.1282 2 12 2 12C2 12 5.63636 19 12 19C12.3412 19 12.6746 18.9799 13 18.9418"
                          stroke="currentColor"
                        />
                      </svg>
                    ) : (
                      // "eye open"
                      <svg
                        width="22"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M22 12C22 12 18.3636 19 12 19C5.63636 19 2 12 2 12C2 12 5.63636 5 12 5C14.8779 5 17.198 6.43162 18.8762 8M9 12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9"
                          stroke="currentColor"
                        />
                      </svg>
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setIsChangePasswordModalOpen(false);
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordError(null);
                  }}
                  className="dark:border-strokedark dark:hover:bg-meta-4 inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="bg-primary hover:bg-opacity-90 inline-flex items-center justify-center rounded-md px-4 py-2 text-white"
                >
                  {isChangingPassword ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white"></div>
                      Changing...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DefaultLayout>
  );
};

export default Profile;
