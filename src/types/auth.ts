// Define the structure of a JWT token payload
export interface AuthToken {
    uid: string;
    roleName: string;
    departmentName: string;
    branchRef: string;
    // permissions: string[];  // Add permissions array to the token type
    iat: number;
    exp: number;
  }
  