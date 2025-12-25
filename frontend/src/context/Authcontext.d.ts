/**
 * 🔐 AUTH CONTEXT TYPES
 * Declaration файл для AuthContext.jsx
 * Соответствует точной структуре из AuthContext.jsx
 */

import React from 'react';

export interface User {
  id?: string;
  username?: string;
  email?: string;
  avatar?: string;
  balance?: number;
  [key: string]: any;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (newToken: string, newUser: User) => void;
  logout: () => void;
}

declare const AuthContext: React.Context<AuthContextType | undefined>;

export function AuthProvider(props: {
  children: React.ReactNode;
}): React.ReactElement;

export function useAuth(): AuthContextType;

export { AuthContext };