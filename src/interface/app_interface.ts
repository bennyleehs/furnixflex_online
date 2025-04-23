//interface for User credentials
export interface IUser {
    id: number;
    email: string;
    uid: string;
    password: string; // Hashed password
  }