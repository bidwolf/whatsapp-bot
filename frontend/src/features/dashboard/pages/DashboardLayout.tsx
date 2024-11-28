import { Outlet } from "react-router";
import Navbar from "../../../components/Navbar";
function DashboardLayout() {
  return (
    <>
      <main className="w-full h-[100vh] bg-zinc-950 flex flex-col  lg:grid grid-cols-12 text-zinc-200 gap-8">
        <nav className="col-span-3">
          <Navbar />
        </nav>
        <section className="col-span-9 m-8">
          <Outlet />
        </section>
      </main>
    </>
  )
}
export default DashboardLayout
