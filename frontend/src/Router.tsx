import { Route, Routes } from "react-router";
import { Login } from "./features/auth/pages/Login";
import DashboardLayout from "./features/dashboard/pages/DashboardLayout";
import DeviceRegistration from "./features/dashboard/pages/DeviceRegistration";
import ManagementPanel from "./features/dashboard/pages/ManagementPanel";

export default function Router() {
  return (
    <Routes>
      <Route element={
        <DashboardLayout />
      } >
        <Route index element={<DeviceRegistration />} />
        <Route path="management" element={<ManagementPanel />} />
      </Route>
      <Route path="/login" element={<Login />} />
    </Routes>)
}
