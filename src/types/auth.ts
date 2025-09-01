export type Role = 'admin' | 'investor';

export interface User {
  id: string;
  email?: string;
  name?: string;
}

export interface AuthContextType {
  user: User | null;
  role: Role;
  isAdmin: boolean;
  isInvestor: boolean;
  loading: boolean;
  session: any; // Supabase session
}
