// Define the structure of a JWT token payload
// Claims for the short-lived Auth Token
export interface AuthToken {
  uid: string;
  roleName: string;
  departmentName: string;
  branchRef: string;
  iat: number;
  exp: number;
}

// Minimal claims for the long-lived Refresh Token
export interface RefreshToken {
  uid: string;
  exp: number;
  type: "refresh"; // Differentiates it from the AuthToken in lib/auth.ts
}

// Claims structure needed to generate a new AuthToken after a refresh
export interface UserClaims {
  uid: string;
  roleName: string;
  departmentName: string;
  branchRef: string;
}

// Union type for the verifyToken return
// The type returned from verifyToken in lib/auth.ts
export type VerifiedToken = AuthToken | RefreshToken | { expired: true } | null;
