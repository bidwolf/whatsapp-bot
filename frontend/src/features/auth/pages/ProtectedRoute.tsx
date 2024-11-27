import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import React, { ReactNode } from "react";
type ProtectedRouteProps = {
  children: ReactNode
}
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { token } = useAuth();
  if (!token) {
    // user is not authenticated
    return <Navigate to="/login" />;
  }
  return children;
};
