"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import Image from "next/image";

// Define the employee type
interface Employee {
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
  branchRef: "string";
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

export default function EmployeeDetailPage() {
  // Replace params with searchParams
  const searchParams = useSearchParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  // Add a ref for the documents section
  const documentsSectionRef = useRef<HTMLDivElement>(null);
  // Add a new ref for the employee details section
  const employeeDetailsSectionRef = useRef<HTMLDivElement>(null);
  // Add a ref for the very top of your content
  const topRef = useRef<HTMLDivElement>(null);

  // Add state to track active tab
  const [activeTab, setActiveTab] = useState<'details' | 'documents'>('details');

  // Add these state variables with your other state declarations
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Fetch employee data
  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        setLoading(true);
        const id = searchParams.get('id');
        
        if (!id) {
          throw new Error("Employee ID is required");
        }

        const res = await fetch(`/api/admin/employee?id=${id}`);
        
        if (!res.ok) {
          throw new Error("Failed to fetch employee data");
        }
        
        const data = await res.json();
        setEmployee(data);
        
        // Fetch documents for this employee
        if (data.uid) {
          const docsRes = await fetch(`/api/admin/employee/upload?employeeUid=${data.uid}`);
          if (docsRes.ok) {
            const docsData = await docsRes.json();
            setDocuments(docsData.documents || []);
            
            // If there's a profile photo and the employee doesn't have one set, update it
            if (docsData.profilePhoto && !data.profilePhoto) {
              setEmployee({
                ...data,
                profilePhoto: docsData.profilePhoto
              });
            }
          }
        }
        
      } catch (err) {
        setError("Error fetching employee data: " + (err instanceof Error ? err.message : String(err)));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, [searchParams]);

  // Navigate back to employee list
  const handleBack = () => {
    router.push("/admin/employee");
  };
  
  // Handle profile photo upload
  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };
  
  // Update uploadProfilePhoto function
  const uploadProfilePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;
    
    try {
      setUploading(true);
      setUploadError(null);
      
      // Create form data for upload
      const formData = new FormData();
      formData.append('photo', file); // Note: still using 'photo' key
      formData.append('employeeId', employee.id.toString());
      formData.append('employeeUid', employee.uid);
      
      // Call API using the combined endpoint
      const response = await fetch('/api/admin/employee/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to upload photo: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update employee state with new photo URL
      setEmployee({
        ...employee,
        profilePhoto: data.photoUrl
      });
      
      // Removed the separate updatePhoto API call
      
      setSuccessMessage("Profile photo updated successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err) {
      console.error("Upload error details:", err);
      setUploadError("Error uploading photo: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
    }
  };
  
  // Handle document upload
  const handleDocumentUpload = () => {
    documentInputRef.current?.click();
  };
  
  // Update uploadDocument function
  const uploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;
    
    try {
      setUploading(true);
      setUploadError(null);
      
      // Create form data for upload
      const formData = new FormData();
      formData.append('document', file); // Note: still using 'document' key
      formData.append('employeeId', employee.id.toString());
      formData.append('employeeUid', employee.uid);
      
      // Call API using the new combined endpoint
      const response = await fetch('/api/admin/employee/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to upload document: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      // Create a new document entry with the returned URL
      const newDocument: Document = {
        id: Date.now(),
        name: file.name,
        type: file.type,
        size: file.size,
        uploadDate: new Date().toISOString().split('T')[0],
        url: data.documentUrl
      };
      
      // Update documents list
      setDocuments([...documents, newDocument]);
      
      setSuccessMessage("Document uploaded successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err) {
      console.error("Upload error details:", err);
      setUploadError("Error uploading document: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
    }
  };
  
  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  // Delete document
  const deleteDocument = async (docId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      setUploading(true);
      
      const response = await fetch('/api/admin/employee/upload', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeUid: employee?.uid,
          documentId: docId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to delete document: ${errorData.message || response.statusText}`);
      }
      
      // Update documents list
      setDocuments(documents.filter(doc => doc.id !== docId));
      
      setSuccessMessage("Document deleted successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err) {
      console.error("Delete error details:", err);
      setUploadError("Error deleting document: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
    }
  };

    // Helper function to format employee address
    const getFormattedAddress = (): React.ReactNode => {
        if (!employee) return null;
        
        const {
            address_line1,
            address_line2,
            city,
            state,
            country
        } = employee;
        
        // Filter out empty address components
        const addressParts = [
            address_line1,
            address_line2,
            city,
            state,
            country
        ].filter(Boolean);
        
        // Return formatted address or empty string if no address information
        if (addressParts.length === 0) return "";
        
        // Join address parts with commas
        return addressParts.join(", ");
    };

  // Create a function to scroll to documents section
  const scrollToDocuments = () => {
    documentsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Update the function to handle tab switching and scrolling
  const handleTabChange = (tab: 'details' | 'documents') => {
    setActiveTab(tab);
    
    if (tab === 'details') {
      // Try multiple approaches to find the right scrollable container
      
      // 1. Try finding common dashboard layout containers
      const contentArea = document.querySelector('.main') || 
                          document.querySelector('.content-main') || 
                          document.querySelector('.main-content') ||
                          document.querySelector('.layout-content') ||
                          document.getElementById('content');
      
      if (contentArea) {
        // Ensure we're scrolling to absolute top with a small delay
        setTimeout(() => {
          contentArea.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }, 10);
      } else {
        // 2. Try scrolling the document body and html element (works in more browsers)
        document.body.scrollTo({ top: 0, behavior: 'smooth' });
        document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
        
        // 3. Fallback to traditional window scrolling
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      
      // 4. As final fallback, try to use the topRef directly
      setTimeout(() => {
        topRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 50);
      
    } else if (tab === 'documents') {
      documentsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Add this function with your other functions
  const handleChangePassword = async () => {
    // Reset errors
    setPasswordError(null);
    
    // Validate passwords
    if (!newPassword) {
      setPasswordError("New password is required");
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    
    try {
      setIsChangingPassword(true);
      
      const response = await fetch('/api/admin/employee/changePassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeId: employee?.id,
          employeeUid: employee?.uid,
          newPassword
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to change password: ${errorData.message || response.statusText}`);
      }
      
      // Reset form and close modal
      setNewPassword('');
      setConfirmPassword('');
      setIsChangePasswordModalOpen(false);
      
      // Show success message
      setSuccessMessage("Password changed successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err) {
      console.error("Password change error:", err);
      setPasswordError("Error changing password: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Employee Details" />
      
      {/* Success message */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
        {/* Header with back button */}
        {/* <div className="flex justify-between items-center">
          <button
            onClick={handleBack}
            className="flex items-center text-blue-600 hover:text-blue-800 dark:text-primary dark:hover:text-primary/80"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              ></path>
            </svg>
            Back to Employee List
          </button>
        </div> */}
        
        {/* Error state */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {/* Upload error */}
        {uploadError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center justify-between">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError(null)}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        
        {/* Employee details */}
        {!loading && !error && employee && (
          <div className="grid grid-cols-1 gap-5">
            {/* Combined Employee and Documents Card */}
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              {/* Top section with photo, name and actions */}
              <div 
                ref={employeeDetailsSectionRef} // Move the ref here
                className="p-6 border-b border-stroke dark:border-strokedark"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Profile Photo */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 dark:border-boxdark mb-3">
                      {employee.profilePhoto ? (
                        <Image 
                          src={employee.profilePhoto} 
                          alt={employee.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 dark:bg-meta-4 flex items-center justify-center">
                          <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
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
                        className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={handlePhotoUpload}
                      >
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
                            clipRule="evenodd"
                          ></path>
                        </svg>
                      </div>
                      
                      {uploading && (
                        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    
                    {/* <button
                      onClick={handlePhotoUpload}
                      className="text-sm text-blue-600 hover:text-blue-800 dark:text-primary dark:hover:text-primary/80"
                    >
                      Change Photo
                    </button> */}
                    
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={uploadProfilePhoto}
                    />
                  </div>
                  
                  {/* Employee Basic Info */}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
                      {employee.name}
                    </h2>
                    <div className="flex flex-wrap items-center text-sm text-gray-500 dark:text-gray-400 gap-2 mb-3">
                      <span>UID: {employee.uid}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-500 dark:bg-gray-400"></span>
                      <span>{employee.roleName}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-500 dark:bg-gray-400"></span>
                      <span>
                        Status: 
                        <span className={`ml-1 font-medium ${
                          employee.status === 'Active' ? 'text-success' : 
                          employee.status === 'Inactive' ? 'text-warning' : 
                          'text-danger'
                        }`}>
                          {employee.status}
                        </span>
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {employee.email && (
                        <div className="flex items-center text-sm">
                          <svg className="w-4 h-4 mr-1 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                          </svg>
                          {employee.email}
                        </div>
                      )}
                      
                      {employee.phone && (
                        <div className="flex items-center text-sm">
                          <svg className="w-4 h-4 mr-1 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path>
                          </svg>
                          {employee.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-start space-x-2">
                    <button
                      onClick={() => router.push(`/admin/employee/edit?id=${employee.id}`)}
                      className="inline-flex items-center justify-center rounded-md bg-gray-50 border border-gray-300 py-2 px-4 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 dark:bg-meta-4 dark:border-strokedark dark:text-white dark:hover:bg-primary dark:hover:text-white"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        ></path>
                      </svg>
                      Edit Employee
                    </button>
                    
                    <button
                      onClick={() => setIsChangePasswordModalOpen(true)}
                      className="inline-flex items-center justify-center rounded-md bg-gray-50 border border-gray-300 py-2 px-4 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 dark:bg-meta-4 dark:border-strokedark dark:text-white dark:hover:bg-primary dark:hover:text-white"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
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
              
              {/* Tabs for Employee Info and Documents */}
              <div className="p-6">
                <div className="mb-6">
                  <div className="border-b border-stroke dark:border-strokedark">
                    <ul className="flex flex-wrap -mb-px">
                      <li className="mr-2">
                        <button
                          onClick={() => handleTabChange('details')}
                          className={`inline-block py-2 px-4 border-b-2 font-medium ${
                            activeTab === 'details' 
                              ? 'border-blue-600 text-blue-600 dark:border-primary dark:text-primary' 
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                          }`}
                        >
                          Employee Details
                        </button>
                      </li>
                      <li className="mr-2">
                        <button
                          onClick={() => handleTabChange('documents')}
                          className={`inline-block py-2 px-4 border-b-2 font-medium ${
                            activeTab === 'documents' 
                              ? 'border-blue-600 text-blue-600 dark:border-primary dark:text-primary' 
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                          }`}
                        >
                          Documents
                          <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 dark:bg-meta-4 rounded-full">
                            {documents.length}
                          </span>
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
                
                {/* Employee Details Section - Remove the ref from here */}
                <div 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-8"
                >
                  {/* Personal Details */}
                  <div>
                    <h3 className="text-xs uppercase font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Personal Details
                    </h3>
                    <ul className="space-y-1">
                      <li className="flex">
                        <span className="text-sm text-gray-500 dark:text-gray-400 w-24">NRIC:</span>
                        <span className="text-sm text-black dark:text-white">{employee.nric || "-"}</span>
                      </li>
                    </ul>
                  </div>
                  
                  {/* Company Details */}
                  <div>
                    <h3 className="text-xs uppercase font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Company Details
                    </h3>
                    <ul className="space-y-1">
                      <li className="flex">
                        <span className="text-sm text-gray-500 dark:text-gray-400 w-24">Branch:</span>
                        <span className="text-sm text-black dark:text-white">{employee.branchName || "-"}</span>
                      </li>
                      <li className="flex">
                        <span className="text-sm text-gray-500 dark:text-gray-400 w-24">Department:</span>
                        <span className="text-sm text-black dark:text-white">{employee.deptName || "-"}</span>
                      </li>
                      <li className="flex">
                        <span className="text-sm text-gray-500 dark:text-gray-400 w-24">Role:</span>
                        <span className="text-sm text-black dark:text-white">{employee.roleName || "-"}</span>
                      </li>
                    </ul>
                  </div>
                  
                  {/* Banking Details */}
                  <div>
                    <h3 className="text-xs uppercase font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Banking Details
                    </h3>
                    <ul className="space-y-1">
                      <li className="flex">
                        <span className="text-sm text-gray-500 dark:text-gray-400 w-24">Bank:</span>
                        <span className="text-sm text-black dark:text-white">{employee.bank_name || "-"}</span>
                      </li>
                      <li className="flex">
                        <span className="text-sm text-gray-500 dark:text-gray-400 w-24">Account:</span>
                        <span className="text-sm text-black dark:text-white">{employee.bank_account || "-"}</span>
                      </li>
                    </ul>
                  </div>
                  
                  {/* Address Information - spans full width */}
                  <div className="lg:col-span-3">
                    <h3 className="text-xs uppercase font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Address
                    </h3>
                    <ul className="space-y-1">
                      <li className="flex flex-col sm:flex-row">
                        <span className="text-sm text-gray-500 dark:text-gray-400 w-24 sm:w-24">Line 1:</span>
                        <span className="text-sm text-black dark:text-white">{employee.address_line1 || "-"}</span>
                      </li>
                      {employee.address_line2 && (
                        <li className="flex flex-col sm:flex-row">
                          <span className="text-sm text-gray-500 dark:text-gray-400 w-24 sm:w-24">Line 2:</span>
                          <span className="text-sm text-black dark:text-white">{employee.address_line2}</span>
                        </li>
                      )}
                      <li className="flex flex-wrap gap-x-4">
                        <div className="flex">
                          <span className="text-sm text-gray-500 dark:text-gray-400 w-24">City:</span>
                          <span className="text-sm text-black dark:text-white">{employee.city || "-"}</span>
                        </div>
                        <div className="flex">
                          <span className="text-sm text-gray-500 dark:text-gray-400 w-24">State:</span>
                          <span className="text-sm text-black dark:text-white">{employee.state || "-"}</span>
                        </div>
                        <div className="flex">
                          <span className="text-sm text-gray-500 dark:text-gray-400 w-24">Country:</span>
                          <span className="text-sm text-black dark:text-white">{employee.country || "-"}</span>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
                
                {/* Documents Section - Always visible with ref for scrolling */}
                <div 
                  ref={documentsSectionRef}
                  className="mt-6 pt-6 border-t border-stroke dark:border-strokedark"
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
                      Documents
                    </h3>
                    
                    <button
                      onClick={handleDocumentUpload}
                      className="inline-flex items-center justify-center rounded-md bg-gray-50 border border-gray-300 py-2 px-4 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 dark:bg-meta-4 dark:border-strokedark dark:text-white dark:hover:bg-primary dark:hover:text-white"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 dark:border-white mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4 mr-2"
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
                    <div className="text-center py-8 text-gray-500">
                      No documents found. Upload a document to get started.
                    </div>
                  ) : (
                    <div className="divide-y divide-stroke dark:divide-strokedark">
                      {documents.map((doc) => (
                        <div key={doc.id} className="py-4 flex items-center justify-between">
                          <div className="flex items-center">
                            {/* Document icon based on type */}
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-meta-4 flex items-center justify-center mr-3">
                              {doc.type.includes('pdf') ? (
                                <svg className="w-6 h-6 text-danger" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                              ) : doc.type.includes('word') || doc.type.includes('document') ? (
                                <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                              ) : doc.type.includes('image') ? (
                                <svg className="w-6 h-6 text-success" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium text-black dark:text-white">
                                {doc.name}
                              </h4>
                              <div className="flex items-center text-xs text-gray-500 mt-1">
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
                              className="text-blue-600 hover:text-blue-800 dark:text-primary dark:hover:text-primary/80"
                              title="View document"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </a>
                            
                            <a
                              href={doc.url}
                              download={doc.name}
                              className="text-blue-600 hover:text-blue-800 dark:text-primary dark:hover:text-primary/80"
                              title="Download document"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </a>
                            
                            <button
                              onClick={() => deleteDocument(doc.id)}
                              className="text-danger hover:text-danger/80"
                              title="Delete document"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
          </div>
        )}
      </div>
      
      {/* Change Password Modal */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-boxdark rounded-sm shadow-lg max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Change Password
              </h3>
              <button 
                onClick={() => {
                  setIsChangePasswordModalOpen(false);
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </button>
            </div>
            
            {passwordError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {passwordError}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-md border border-stroke bg-transparent py-3 px-4 text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-strokedark dark:text-white dark:focus:border-primary"
                  placeholder="Enter new password"
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border border-stroke bg-transparent py-3 px-4 text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-strokedark dark:text-white dark:focus:border-primary"
                  placeholder="Confirm new password"
                />
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => {
                    setIsChangePasswordModalOpen(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError(null);
                  }}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 py-2 px-4 text-gray-700 hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="inline-flex items-center justify-center rounded-md bg-primary py-2 px-4 text-white hover:bg-opacity-90"
                >
                  {isChangingPassword ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
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
}