// Define the structure of a JWT token payload
export interface AuthToken {
    id: number;
    role: number;
    department: number;
    branch: number;
    iat: number;
    exp: number;
  }
  