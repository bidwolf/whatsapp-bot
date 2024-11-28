import React from "react";
type AuthContext = {
  token: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean
};

export const AuthContext = React.createContext<AuthContext>({
} as AuthContext)
