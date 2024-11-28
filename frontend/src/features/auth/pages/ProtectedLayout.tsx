import { Navigate, Outlet } from "react-router";
import { useAuth } from "../hooks/useAuth";

const ProtectedLayout = () => {
  const { token, loading } = useAuth();
  if (loading) {
    return <p>carregando...</p>
  }
  if (!token) {
    // user is not authenticated
    return <Navigate to="/login" replace state={{ path: location.pathname }} />
  }
  return <>
    <Outlet />
  </>
};
export default ProtectedLayout
