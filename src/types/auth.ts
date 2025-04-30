// Define the structure of a JWT token payload
export interface AuthToken {
    id: number;
    role: number;
    department: number;
    branch: number;
    // role: string;
    // department: string;
    // branch: string;
    iat: number;
    exp: number;
  }
  