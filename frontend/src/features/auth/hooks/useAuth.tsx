import React from "react";
import { AuthContext } from "../context/auth";

export function useAuth() {
  return React.useContext(AuthContext);
}
