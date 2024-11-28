import { Route, Routes } from "react-router";
import Login from "./features/auth/pages/Login";
import DashboardLayout from "./features/dashboard/pages/DashboardLayout";
import InstanceRegistration from "./features/instance/pages/InstanceRegistration";
import InstanceManagement from "./features/instance/pages/InstanceManagement";
import ProtectedLayout from "./features/auth/pages/ProtectedLayout";
import GroupManagement from "./features/group/pages/GroupManagement";
import GroupRegistration from "./features/group/pages/GroupRegistration";

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedLayout />}>
        <Route element={
          <DashboardLayout />
        } >
          <Route index element={<InstanceManagement />} />
          <Route path="register" element={<InstanceRegistration />} />
          <Route path="groups/:instanceKey" element={<GroupManagement />} />
          <Route path="groups/:instanceKey/register" element={<GroupRegistration />} />
        </Route>
      </Route>
      <Route path="/login" element={<Login />} />
    </Routes>)
}
