import { Outlet } from "react-router";
function DashboardLayout() {
  return (
    <>
      <main className="w-full h-[100vh] bg-zinc-950 flex justify-center flex-col items-center text-zinc-200 gap-8">
        <Outlet />
      </main>
    </>
  )
}
export default DashboardLayout
