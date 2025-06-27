"use client";
import { useEffect, useState, useRef } from "react";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import usePermissions from "@/hooks/usePermissions";

const MENU = "1";
const SUBMENU = "0";
const PERMISSION_PREFIX = `${MENU}.${SUBMENU}`;

// Define the employee type
interface Employee {
  id: string;
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
  deptRef?: string;  // Add this
  branch: string;
  department: string;
  role: string;
  status: string;
  fullName?: string;
  contactInfo?: string;
  fullAddress?: string;
  bankInfo?: string;
  position?: string;
  branchName?: string;
  deptName?: string;
  roleName?: string;
}

export default function EmployeePage() {
  // Data states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    uid: '',
    name: '',
    nric: '',
    phone: '',
    email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    country: '',
    bank_name: '',
    bank_account: '',
    branchRef: '',
    branch: '',
    department: '',
    role: '',
    status: '',
  });
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  
  // Permissions
  const { canCreate, canEdit, canDelete, loadingPermissions } = usePermissions();
  
  // Filter states
  const [branchFilter, setBranchFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Add these state variables with your other state declarations
  const [branchOptions, setBranchOptions] = useState<string[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [branchesData, setBranchesData] = useState<any[]>([]);
  const [departmentsData, setDepartmentsData] = useState<any[]>([]);
  
  // Fetch employees data
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/employee");
      
      if (!res.ok) {
        throw new Error("Failed to fetch employees");
      }
      
      const data = await res.json();
      
      // Format employee data
      const formattedData = data.listEmployee.map((employee:any) => ({
        ...employee,
        id: `${employee.id}`,
        uid: `${employee.uid}`,
        fullName: `${employee.name} / ${employee.nric}`,
        contactInfo: `${employee.phone} / ${employee.email}`,
        fullAddress: `${employee.address_line1}, ${employee.address_line2}, ${employee.city}, ${employee.state}, ${employee.country}`,
        bankInfo: `${employee.bank_name}, ${employee.bank_account}`,
        position: `${employee.branchName} / ${employee.deptName} / ${employee.roleName}`,
      }));
      
      setEmployees(formattedData);
      setFilteredEmployees(formattedData);
    } catch (err) {
      setError("Error fetching employees: " + (err instanceof Error ? err.message : String(err)));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    // Remove the hasFetchedData.current check to allow reloading when page changes
    fetchEmployees();
    fetchOptionsData();
    
    // Add a router event listener for page changes
    const handleRouteChange = () => {
      fetchEmployees();
      fetchOptionsData();
    };
    
    // Clean up event listener on component unmount
    return () => {
      // If using Next.js Router, you'd clean up the event listener here
    };
  }, []); // Keep the empty dependency array
  
  // Handle form input changes
  const handleChange = (e: { target: { name: any; value: any; }; }) => {
    const { name, value } = e.target;
    
    // Don't allow direct changes to UID in create mode if we have all three values
    if (name === 'uid' && !isEditMode && formData.branch && formData.department && formData.role) {
      return; // Prevent manual changes to auto-generated UIDs
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  // Handle filter changes
  const handleFilterChange = (e: { target: { name: any; value: any; }; }) => {
    const { name, value } = e.target;
    
    switch(name) {
      case 'branch':
        setBranchFilter(value);
        break;
      case 'department':
        setDepartmentFilter(value);
        break;
      case 'status':
        setStatusFilter(value);
        break;
    }
  };
  
  // Open modal to create new employee
  const openCreateModal = () => {
    // Reset form data
    setFormData({
      uid: '',
      name: '',
      nric: '',
      phone: '',
      email: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      country: '',
      bank_name: '',
      bank_account: '',
      branchRef: '',
      branch: '',
      department: '',
      role: '',
      status: '',
    });
    setCurrentEmployee(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  };
  
  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
  };
  
  // Create new employee
  const createEmployee = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Map form fields to match database column names
      const mappedData = {
        ...formData,
        branchName: formData.branch,
        branchRef: getBranchRefByName(formData.branch),
        deptName: formData.department,
        deptRef: getDeptRefByName(formData.department),
        roleName: formData.role
      };
      
      console.log("Create payload:", mappedData);
      
      const response = await fetch("/api/admin/employee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mappedData),
      });
      
      // Get the response data for more detailed error information
      const responseData = await response.json().catch(() => null);
      
      if (!response.ok) {
        const errorMessage = responseData?.message || "Failed to create employee";
        throw new Error(errorMessage);
      }
      
      // Refresh employee list
      fetchEmployees();
      
      // Close modal
      closeModal();
      
      // Show success message (optional)
      setError(null); // Clear any previous errors
    } catch (err) {
      setError("Error creating employee: " + (err instanceof Error ? err.message : String(err)));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  

  // Open modal to edit employee
  const formRef = useRef<HTMLFormElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Improved openEditModal function to ensure all data is loaded
  const openEditModal = (employee: Employee) => {
    // Store the complete employee object for reference
    setCurrentEmployee(employee);
    
    // Log the employee data for debugging
    console.log("Opening edit modal for employee:", employee);
    
    // Extract branch, department and role data with proper fallbacks
    const branchName = employee.branchName || employee.position?.split(' / ')[0] || '';
    const deptName = employee.deptName || employee.position?.split(' / ')[1] || '';
    const roleName = employee.roleName || employee.position?.split(' / ')[2] || '';
    
    // Find the branch reference that matches the branch name
    const branch = branchesData.find(b => b.name === branchName);
    const branchRef = branch?.ref || null;
    
    // Find the department reference that matches the department name
    const dept = departmentsData.find(d => d.name === deptName);
    const deptRef = dept?.ref || null;
    
    console.log("Extracted values:", { branchName, deptName, roleName, branchRef, deptRef });
    
    // Set all form values with proper fallbacks
    setFormData({
      uid: employee.uid || '',
      name: employee.name || '',
      nric: employee.nric || '',
      phone: employee.phone || '',
      email: employee.email || '',
      address_line1: employee.address_line1 || '',
      address_line2: employee.address_line2 || '',
      city: employee.city || '',
      state: employee.state || '',
      country: employee.country || '',
      bank_name: employee.bank_name || '',
      bank_account: employee.bank_account || '',
      branchRef: branchRef || employee.branchRef || '',
      branch: branchName || '',
      department: deptName || '',
      role: roleName || '',
      status: employee.status || '',
    });
    
    // Ensure options are available in dropdowns if they're not already in the lists
    if (branchName && !branchOptions.includes(branchName)) {
      setBranchOptions([...branchOptions, branchName]);
    }
    
    if (deptName && !departmentOptions.includes(deptName)) {
      setDepartmentOptions([...departmentOptions, deptName]);
    }
    
    if (roleName && !roleOptions.includes(roleName)) {
      setRoleOptions([...roleOptions, roleName]);
    }
    
    // Enable edit mode and open the modal
    setIsEditMode(true);
    setIsModalOpen(true);
    
    // Use setTimeout to ensure the modal is rendered before focusing
    setTimeout(() => {
      // Scroll form to top
      if (formRef.current) {
        formRef.current.scrollTop = 0;
      }
      
      // Focus on the name field
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 150);
  };

  // Update employee
  const updateEmployee = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    
    if (!currentEmployee) return;
    
    try {
      setLoading(true);
      
      const employeeId = currentEmployee.id.split(' / ')[0];
      
      // Log request details for debugging
      console.log("Updating employee with ID:", employeeId);
      
      // Map form fields to match database column names
      const mappedData = {
        ...formData,
        branchRef: formData.branchRef,    // Map branch to branchName
        branchName: formData.branch,    // Map branch to branchName
        deptName: formData.department,  // Map department to deptName
        roleName: formData.role         // Map role to roleName
      };
      
      console.log("Update payload:", mappedData);
      
      // Use query parameter format instead of path parameter
      const response = await fetch(`/api/admin/employee?id=${employeeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mappedData),
      });
      
      // Get the response data for more detailed error information
      const responseData = await response.json().catch(() => null);
      
      if (!response.ok) {
        const errorMessage = responseData?.message || "Failed to update employee";
        throw new Error(errorMessage);
      } else {
        // Refresh employee list
        await fetchEmployees();
        
        // Refresh options data
        await fetchOptionsData();
        
        // Close modal
        closeModal();
        
        // Show success message (optional)
        setError(null); // Clear any previous errors
      }
    } catch (err) {
      const errorMessage = "Error updating employee: " + (err instanceof Error ? err.message : String(err));
      setError(errorMessage);
      console.error("Update employee error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Add this function to mark an employee as history (reuses edit logic)
  const markAsHistory = (employee: Employee) => {
    if (!confirm("Are you sure you want to mark this employee as history?")) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Extract the real values just like in openEditModal
      const branchName = employee.branchName || employee.position?.split(' / ')[0] || '';
      const deptName = employee.deptName || employee.position?.split(' / ')[1] || '';
      const roleName = employee.roleName || employee.position?.split(' / ')[2] || '';
      
      // Find the branch reference that matches the branch name
      const branch = branchesData.find(b => b.name === branchName);
      const branchRef = branch?.ref || null;
      
      // Set up form data with all existing values
      const historyFormData = {
        uid: employee.uid || '',
        name: employee.name || '',
        nric: employee.nric || '',
        phone: employee.phone || '',
        email: employee.email || '',
        address_line1: employee.address_line1 || '',
        address_line2: employee.address_line2 || '',
        city: employee.city || '',
        state: employee.state || '',
        country: employee.country || '',
        bank_name: employee.bank_name || '',
        bank_account: employee.bank_account || '',
        branchRef: branchRef || '',
        branch: branchName || '',
        department: deptName || '',
        role: roleName || '',
        status: 'History' // Set status to History
      };
      
      // Use the existing update API endpoint
      const employeeId = employee.id.split(' / ')[0];
      
      // Map form fields to match database column names (similar to updateEmployee)
      const mappedData = {
        ...historyFormData,
        branchRef: historyFormData.branchRef,
        branchName: historyFormData.branch,
        deptName: historyFormData.department,
        roleName: historyFormData.role
      };
      
      // Call API to update employee status
      fetch(`/api/admin/employee?id=${employeeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mappedData),
      })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          throw new Error(data.message || "Failed to mark employee as history");
        }
        
        // Refresh employee list
        fetchEmployees();
        setError(null);
      })
      .catch(err => {
        setError("Error marking employee as history: " + 
          (err instanceof Error ? err.message : String(err)));
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
      
    } catch (err) {
      setError("Error preparing data: " + 
        (err instanceof Error ? err.message : String(err)));
      console.error(err);
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    
    if (isEditMode) {
      updateEmployee(e);
    } else {
      createEmployee(e);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setBranchFilter('');
    setDepartmentFilter('');
    setStatusFilter('');
  };

  // Apply filters whenever they change
  useEffect(() => {
    if (!employees.length) return;
    
    let filtered = [...employees];
    
    if (branchFilter) {
      filtered = filtered.filter(emp => emp.branchName === branchFilter);
    }
    
    if (departmentFilter) {
      filtered = filtered.filter(emp => emp.deptName === departmentFilter);
    }
    
    if (statusFilter) {
      filtered = filtered.filter(emp => emp.status === statusFilter);
    }
    
    setFilteredEmployees(filtered);
  }, [branchFilter, departmentFilter, statusFilter, employees]);

  // // Function to extract unique options from employee data
  // const extractOptions = () => {
  //   const branches = [...new Set(employees.map(emp => emp.branch))].filter(Boolean).sort();
  //   const departments = [...new Set(employees.map(emp => emp.department))].filter(Boolean).sort();
  //   const roles = [...new Set(employees.map(emp => emp.role))].filter(Boolean).sort();
    
  //   setBranchOptions(branches);
  //   setDepartmentOptions(departments);
  //   setRoleOptions(roles);
  // };

  // // Call extractOptions whenever employees data changes
  // useEffect(() => {
  //   if (employees.length) {
  //     extractOptions();
  //   }
  // }, [employees]);

  useEffect(() => {
      const extractOptions = () => {
        const branches = [...new Set(employees.map((emp) => emp.branch))]
          .filter(Boolean)
          .sort();
        const departments = [...new Set(employees.map((emp) => emp.department))]
          .filter(Boolean)
          .sort();
        const roles = [...new Set(employees.map((emp) => emp.role))]
          .filter(Boolean)
          .sort();
  
        setBranchOptions(branches);
        setDepartmentOptions(departments);
        setRoleOptions(roles);
      };
  
      if (employees.length) {
        extractOptions();
      }
    }, [employees]);

  // Add these helper functions before your return statement
  const getBranchOptions = () => branchOptions;
  const getDepartmentOptions = () => departmentOptions;
  const getStatusOptions = () => [...new Set(employees.map(emp => emp.status))].filter(Boolean).sort();

  // Add this helper function before your return statement
  const getBranchRefByName = (branchName: string) => {
    const branch = branchesData.find(b => b.name === branchName);
    return branch?.ref || null;
  };

  // Add this helper function before your return statement
  const getDeptRefByName = (deptName: string) => {
    const dept = departmentsData.find(d => d.name === deptName);
    return dept?.ref || null;
  };

  // Add these functions near your other fetch functions
  const fetchOptionsData = async () => {
    try {
      // Fetch branches
      const branchRes = await fetch("/api/admin/branch");
      if (!branchRes.ok) throw new Error("Failed to fetch branches");
      const branchData = await branchRes.json();
      
      // Fetch departments
      const deptRes = await fetch("/api/admin/department");
      if (!deptRes.ok) throw new Error("Failed to fetch departments");
      const deptData = await deptRes.json();
      
      // Fetch roles
      const roleRes = await fetch("/api/admin/role");
      if (!roleRes.ok) throw new Error("Failed to fetch roles");
      const roleData = await roleRes.json();
      
      // Store complete branch and department data for reference lookup
      setBranchesData(branchData.listBranch || []);
      setDepartmentsData(deptData.listDepartment || []);
      
      // Set the options arrays for dropdowns
      const branchOptions = branchData.listBranch.map((item: any) => item.name).filter(Boolean);
      const deptOptions = deptData.listDepartment.map((item: any) => item.name).filter(Boolean);
      const roleOptions = roleData.listRole.map((item: any) => item.name).filter(Boolean);
      
      setBranchOptions(branchOptions);
      setDepartmentOptions(deptOptions);
      setRoleOptions(roleOptions);
      
      console.log("Filter options loaded:", { 
        branches: branchOptions.length, 
        departments: deptOptions.length, 
        roles: roleOptions.length 
      });
    } catch (err) {
      console.error("Error fetching dropdown options:", err);
    }
  };
  
  // Modify the handleBranchChange function
  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const branchName = e.target.value;
    const branch = branchesData.find(b => b.name === branchName);
    
    setFormData(prev => {
      const updated = {
        ...prev,
        branch: branchName,
        branchRef: branch?.ref || null
      };
      
      // Auto-generate UID if not in edit mode and both branch and department are selected
      // We only need branch and department now, not role
      if (!isEditMode && updated.branch && updated.department) {
        updated.uid = generateUID();
      }
      
      return updated;
    });
  };
  
  // Update department handler
  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const dept = departmentsData.find(d => d.name === value);
    
    setFormData(prev => {
      const updated = {
        ...prev,
        department: value,
        deptRef: dept?.ref || null
      };
      
      // Auto-generate UID if not in edit mode and both branch and department are selected
      if (!isEditMode && updated.branch && updated.department) {
        updated.uid = generateUID();
      }
      
      return updated;
    });
  };
  
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    
    setFormData(prev => {
      const updated = {
        ...prev,
        role: value
      };
      
      // Auto-generate UID if not in edit mode and all required fields are selected
      if (!isEditMode && updated.branch && updated.department && updated.role) {
        updated.uid = generateUID();
      }
      
      return updated;
    });
  };
  
  // This function is already defined above, so removing the duplicate declaration
  
  // Add this function with your helper functions
  const generateUID = () => {
    if (!isEditMode && formData.branch && formData.department) {
      // Get the branchRef from the selected branch
      const branchRef = getBranchRefByName(formData.branch) || '';
      
      // Find departmentRef from departments data
      const deptRef = getDeptRefByName(formData.department) || '';
      
      if (!branchRef || !deptRef) {
        console.warn("Missing reference for branch or department");
        return '';
      }
      
      // Count existing employees with the same branch NAME and department NAME
      // This ensures we're counting all employees in the same department regardless of ref
      const sameTypeEmployees = employees.filter(emp => 
        emp.branchName === formData.branch && 
        emp.deptName === formData.department
      );
      
      // Generate next running number (count + 1), padding to 4 digits
      const nextNumber = (sameTypeEmployees.length + 1).toString().padStart(4, '0');
      
      // Format with hyphens for better readability: branchRef-deptRef-0001
      const newUID = `${branchRef}${deptRef}${nextNumber}`;
      
      console.log(`Generated UID: ${newUID} (Found ${sameTypeEmployees.length} existing employees with branch "${formData.branch}" and department "${formData.department}")`);
      return newUID;
    }
    return '';
  };
  
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Employee Management" />
      
      <div className="flex flex-col gap-5">
        {/* Create/Edit Form Card - Displayed on top when open */}
        {isModalOpen && (
          <div 
            className={`rounded-sm border ${
              isEditMode 
                ? 'border-primary/50 shadow-lg dark:border-primary/30' 
                : 'border-stroke dark:border-strokedark'
            } bg-white shadow-default dark:bg-boxdark w-full mb-5`}
          >
            {/* Form header with edit indicator and action buttons */}
            <div className="px-6 py-4 border-b border-stroke dark:border-strokedark flex justify-between items-center">
              <h4 className="text-lg font-semibold text-black dark:text-white flex items-center">
                {isEditMode ? (
                  <>
                    <span className="mr-2 text-primary">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                      </svg>
                    </span>
                    Edit Employee:  <span className="font-bold"> ({formData.uid} - {formData.name})</span>
                  </>
                ) : (
                  'Add New Employee'
                )}
              </h4>
              
              {/* Action buttons moved to header */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition dark:bg-meta-4 dark:hover:bg-meta-3 dark:text-white text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="employeeForm" // Connect to form ID
                  className={`px-3 py-1.5 ${
                    isEditMode 
                      ? 'bg-primary hover:bg-primary/90' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white rounded-md transition text-sm`}
                >
                  {isEditMode ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
            
            <form 
              id="employeeForm" // Add ID to connect with the submit button in header
              ref={formRef} 
              onSubmit={handleSubmit} 
              className="px-6 py-4 overflow-y-auto max-h-[calc(100vh-200px)]"
            >
              {/* Basic Information Section */}
              <div className="mb-4">
                {/* <h4 className="text-lg font-medium text-black dark:text-white mb-3">
                  Basic Information
                </h4> */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* UID field - Read-only when editing */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      UID {/* Removed the required asterisk */}
                    </label>
                    <input
                      ref={firstInputRef}
                      type="text"
                      name="uid"
                      value={formData.uid}
                      onChange={handleChange}
                      readOnly
                      // readOnly={isEditMode}
                      disabled={isEditMode}
                      className={`w-full rounded border-[1.5px] border-stroke ${
                        isEditMode ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'bg-transparent'
                      } py-3 px-5 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary`}
                    />
                    {!isEditMode && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Auto-generated from branch and department selections
                      </p>
                    )}
                  </div>
                  
                  {/* Name field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Name <span className="text-danger">*</span>
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      required
                    />
                  </div>
                  
                  {/* NRIC field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      NRIC
                    </label>
                    <input
                      type="text"
                      name="nric"
                      value={formData.nric}
                      onChange={handleChange}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  
                  {/* Status field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      {/* <option value="Suspended">Suspended</option> */}
                      <option value="History">History</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Contact Information */}
              <div className="mb-4 mt-6">
                {/* <h4 className="text-lg font-medium text-black dark:text-white mb-3">
                  Contact Information
                </h4> */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Phone field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  
                  {/* Email field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  
                  {/* Address Line 1 field - spans 2 columns */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      name="address_line1"
                      value={formData.address_line1}
                      onChange={handleChange}
                      placeholder="Address Line 1"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                </div>
                
                {/* Second row of contact info */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
                  <div className="lg:col-span-2">
                    <input
                      type="text"
                      name="address_line2"
                      value={formData.address_line2}
                      onChange={handleChange}
                      placeholder="Address Line 2"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  
                  <div>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="City"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  
                  <div>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="State"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  
                  <div>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      placeholder="Country"
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                </div>
              </div>
              
              {/* Company Information */}
              <div className="mb-4 mt-6">
                {/* <h4 className="text-lg font-medium text-black dark:text-white mb-3">
                  Company Information
                </h4> */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Branch field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Branch
                    </label>
                    <select
                      name="branch"
                      value={formData.branch}
                      onChange={handleBranchChange}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    >
                      <option value="">Select Branch</option>
                      {branchOptions.map((branch, index) => (
                        <option key={`form-branch-${index}`} value={branch}>{branch}</option>
                      ))}
                      {formData.branch && !branchOptions.includes(formData.branch) && (
                        <option value={formData.branch}>{formData.branch}</option>
                      )}
                    </select>
                  </div>
                  
                  {/* Department field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Department
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleDepartmentChange} // Use the new handler
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    >
                      <option value="">Select Department</option>
                      {departmentOptions.map((dept, index) => (
                        <option key={`form-dept-${index}`} value={dept}>{dept}</option>
                      ))}
                      {formData.department && !departmentOptions.includes(formData.department) && (
                        <option value={formData.department}>{formData.department}</option>
                      )}
                    </select>
                  </div>
                  
                  {/* Role field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Role
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleRoleChange} // Use the new handler
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    >
                      <option value="">Select Role</option>
                      {roleOptions.map((role, index) => (
                        <option key={`form-role-${index}`} value={role}>{role}</option>
                      ))}
                      {formData.role && !roleOptions.includes(formData.role) && (
                        <option value={formData.role}>{formData.role}</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Banking Information */}
              <div className="mb-4 mt-6">
                {/* <h4 className="text-lg font-medium text-black dark:text-white mb-3">
                  Banking Information
                </h4> */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bank Name field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleChange}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                  
                  {/* Bank Account field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Bank Account
                    </label>
                    <input
                      type="text"
                      name="bank_account"
                      value={formData.bank_account}
                      onChange={handleChange}
                      className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}
        
        {/* Employee List Card - Always displayed */}
        <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1 w-full">
          {/* Header and Create Button */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              {/* Branch Filter */}
              <div className="min-w-[150px]">
                <select
                  name="branch"
                  value={branchFilter}
                  onChange={handleFilterChange}
                  className="w-full rounded-lg border border-stroke bg-white dark:bg-boxdark py-2 px-4 outline-none focus:border-primary focus-visible:shadow-none dark:border-strokedark dark:text-white text-sm"
                >
                  <option value="">All Branches</option>
                  {/* Use the branchOptions state directly instead of deriving from employees */}
                  {branchOptions
                    .sort()
                    .map((branch, index) => (
                      <option key={`branch-filter-${index}`} value={branch}>{branch}</option>
                    ))
                  }
                </select>
              </div>
              
              {/* Department Filter */}
              <div className="min-w-[150px]">
                <select
                  name="department"
                  value={departmentFilter}
                  onChange={handleFilterChange}
                  className="w-full rounded-lg border border-stroke bg-white dark:bg-boxdark py-2 px-4 outline-none focus:border-primary focus-visible:shadow-none dark:border-strokedark dark:text-white text-sm"
                >
                  <option value="">All Departments</option>
                  {getDepartmentOptions().map((dept, index) => (
                    <option key={`dept-${index}`} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              
              {/* Status Filter */}
              <div className="min-w-[150px]">
                <select
                  name="status"
                  value={statusFilter}
                  onChange={handleFilterChange}
                  className="w-full rounded-lg border border-stroke bg-white dark:bg-boxdark py-2 px-4 outline-none focus:border-primary focus-visible:shadow-none dark:border-strokedark dark:text-white text-sm"
                >
                  <option value="">All Status</option>
                  {getStatusOptions().map((status, index) => (
                    <option key={`status-${index}`} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              
              {/* Reset Filters Button */}
              <button
                onClick={resetFilters}
                className="rounded-lg border border-stroke bg-white dark:bg-boxdark py-2 px-4 text-sm text-black dark:text-white hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors"
              >
                Reset
              </button>
            </div>
            
            {/* Keep the create button */}
            {!loadingPermissions && canCreate(MENU, SUBMENU) && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 py-2 px-4 text-white hover:bg-blue-700"
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
                    d="M12 4v16m8-8H4"
                  ></path>
                </svg>
                Add New Employee
              </button>
            )}
          </div>
          
          {/* Error and Loading states */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          
          {/* Employee Table */}
          {!loading && !error && (
            <div className="max-w-full overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 text-left dark:bg-meta-4">
                    <th className="py-4 px-4 font-medium text-black dark:text-white">
                      UID
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white">
                      Name/NRIC
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white">
                      Contact
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white">
                      Position
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white">
                      Status
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 px-4 text-center">
                        No employees found
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((employee, index) => (
                      <tr
                        key={index}
                        className={`${
                          index % 2 === 0
                            ? "bg-white dark:bg-boxdark"
                            : "bg-gray-1 dark:bg-meta-4"
                        }`}
                      >
                        <td className="py-3 px-4">{employee.uid}</td>
                        <td className="py-3 px-4">{employee.fullName}</td>
                        <td className="py-3 px-4">{employee.contactInfo}</td>
                        <td className="py-3 px-4">{employee.position}</td>
                        <td className="py-3 px-4">
                          {employee.status}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(employee)}
                              className="text-primary hover:text-primary/90" // Changed from blue to primary
                              title="Edit employee"
                              disabled={!canEdit(MENU, SUBMENU)}
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                ></path>
                              </svg>
                            </button>
                            
                            {/* Delete Button */}
                            <button
                              onClick={() => markAsHistory(employee)}
                              className="text-danger hover:text-red-700"
                              title="Mark as history"
                              disabled={!canDelete(MENU, SUBMENU)}
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                ></path>
                              </svg>
                            </button>
                            
                            {/* View Button */}
                            <button
                              onClick={() => window.open(`/admin/employee/view/${employee.id.split(' / ')[0]}`, '_blank')}
                              className="text-gray-500 hover:text-gray-700"
                              title="View employee details"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                ></path>
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                ></path>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DefaultLayout>
  );
}