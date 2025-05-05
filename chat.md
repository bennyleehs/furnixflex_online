bennyleehs: may i have the last week answer or look back the history

GitHub Copilot: # Access Control System for Sidebar Menu and Routes

Here's the implementation for an access control system that controls sidebar menu visibility and route access based on user access codes:

## 1. Create Access Control Utilities

First, create a utility file to manage access codes and permissions:

````javascript
/**
 * Constants for user access codes
 */
export const ACCESS_CODES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER', 
  HR: 'HR',
  EMPLOYEE: 'EMPLOYEE'
};

/**
 * Define route permissions based on access codes
 */
export const ROUTE_PERMISSIONS = {
  '/admin/dashboard': [ACCESS_CODES.ADMIN, ACCESS_CODES.MANAGER, ACCESS_CODES.HR, ACCESS_CODES.EMPLOYEE],
  '/admin/users': [ACCESS_CODES.ADMIN],
  '/admin/employee': [ACCESS_CODES.ADMIN, ACCESS_CODES.HR],
  '/admin/reports': [ACCESS_CODES.ADMIN, ACCESS_CODES.MANAGER],
  '/admin/settings': [ACCESS_CODES.ADMIN]
};

/**
 * Define sidebar menu items with their associated access codes
 */
export const SIDEBAR_MENU = [
  {
    title: 'Dashboard',
    path: '/admin/dashboard',
    icon: 'dashboard',
    accessCodes: [ACCESS_CODES.ADMIN, ACCESS_CODES.MANAGER, ACCESS_CODES.HR, ACCESS_CODES.EMPLOYEE]
  },
  {
    title: 'User Management',
    path: '/admin/users',
    icon: 'people',
    accessCodes: [ACCESS_CODES.ADMIN]
  },
  {
    title: 'Employee Management',
    path: '/admin/employee',
    icon: 'badge',
    accessCodes: [ACCESS_CODES.ADMIN, ACCESS_CODES.HR]
  },
  {
    title: 'Reports',
    path: '/admin/reports',
    icon: 'assessment',
    accessCodes: [ACCESS_CODES.ADMIN, ACCESS_CODES.MANAGER]
  },
  {
    title: 'Settings',
    path: '/admin/settings',
    icon: 'settings',
    accessCodes: [ACCESS_CODES.ADMIN]
  }
];

/**
 * Check if a user has access to a specific route
 */
export const hasRouteAccess = (userAccessCode, route) => {
  if (!userAccessCode || !ROUTE_PERMISSIONS[route]) return false;
  return ROUTE_PERMISSIONS[route].includes(userAccessCode);
};

/**
 * Filter sidebar menu based on user access code
 */
export const getFilteredMenu = (userAccessCode) => {
  if (!userAccessCode) return [];
  return SIDEBAR_MENU.filter(item => item.accessCodes.includes(userAccessCode));
};
````

## 2. Create Authentication Context

Implement an authentication context to manage user state:

````javascript
'use client';
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage or API on initial render
    const loadUser = () => {
      try {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          setCurrentUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);

  const login = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setCurrentUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
````

## 3. Implement Protected Route Component for Next.js

Create a component to protect routes based on access codes:

````javascript
'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { hasRouteAccess } from '@/utils/accessControl';

export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        // Redirect to login if not authenticated
        router.push('/login');
      } else if (!hasRouteAccess(currentUser.accessCode, pathname)) {
        // Redirect to unauthorized if no permission
        router.push('/unauthorized');
      }
    }
  }, [currentUser, loading, pathname, router]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!currentUser) {
    return null;
  }

  if (!hasRouteAccess(currentUser.accessCode, pathname)) {
    return null;
  }

  return children;
}
````

## 4. Implement Sidebar with Access Control

Create a sidebar component that filters menu items by access code:

````javascript
'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getFilteredMenu } from '@/utils/accessControl';

const Sidebar = () => {
  const { currentUser } = useAuth();
  const pathname = usePathname();
  
  // Get menu items filtered by user's access code
  const menuItems = currentUser ? getFilteredMenu(currentUser.accessCode) : [];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Admin Dashboard</h2>
      </div>
      
      <div className="sidebar-menu">
        {menuItems.map((item) => (
          <Link 
            key={item.path}
            href={item.path}
            className={`sidebar-menu-item ${pathname === item.path ? 'active' : ''}`}
          >
            <i className="material-icons">{item.icon}</i>
            <span>{item.title}</span>
          </Link>
        ))}
      </div>
      
      {currentUser && (
        <div className="sidebar-footer">
          <p>Logged in as: {currentUser.name}</p>
          <p>Access: {currentUser.accessCode}</p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
````

## 5. Update Layout Component with Authentication Provider

Wrap your application with the AuthProvider in your layout:

````javascript
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
````

## 6. Protect Admin Routes with Layout Wrapper

Create a protected layout for admin routes:

````javascript
'use client';
import DefaultLayout from '@/components/Layouts/DefaultLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DefaultLayout>
        {children}
      </DefaultLayout>
    </ProtectedRoute>
  );
}
````

This implementation provides:
1. A flexible access control system based on user access codes
2. Protected routes that redirect unauthorized users
3. A sidebar menu that only shows items the user has permission to access
4. Persistent authentication using localStorage

You can expand the ACCESS_CODES and ROUTE_PERMISSIONS objects as needed for your specific application requirements.

Similar code found with 1 license type

