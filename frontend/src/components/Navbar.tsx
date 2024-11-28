import React, { HTMLProps } from "react"
import { NavLink } from "react-router"
import { HomeIcon, ComponentInstanceIcon, ExitIcon } from '@radix-ui/react-icons'
import { useAuth } from "../features/auth/hooks/useAuth"
type NavbarProps = HTMLProps<HTMLUListElement> & {}
const Navbar: React.FC<NavbarProps> = () => {
  const { signOut } = useAuth()
  return (
    <div className="flex justify-between md:flex-col md:h-full bg-slate-100/5 p-2 ">
      <ul className="flex gap-4 md:flex-col justify-center md:justify-normal">
        <li >
          <NavLink to={'/'} tabIndex={0} className={(state) => `flex gap-2 items-center p-2 transition-colors hover:bg-primary-50/5 active:bg-primary-50/10 ${state.isActive ? 'border-b border-primary-300' : ''}`}>
            <HomeIcon />
            <span className="sr-only md:not-sr-only">Painel principal</span>
          </NavLink>
        </li>
        <li >
          <NavLink
            className={(state) => `flex gap-2 items-center p-2 transition-colors hover:bg-primary-50/5 active:bg-primary-50/10 ${state.isActive ? 'border-b border-primary-300' : ''}`}
            to={'/register'}
            tabIndex={1}>
            <ComponentInstanceIcon />
            <span className="sr-only md:not-sr-only">Registrar instância</span>
          </NavLink>
        </li>
      </ul>
      <ul>
        <li>
          <button
            type="button"
            className="flex gap-2 items-center p-2 transition-colors hover:bg-primary-50/5 active:bg-primary-50/10 w-full "
            onClick={() => { signOut() }}
          >
            <ExitIcon />
            <span className="sr-only md:not-sr-only">Exit</span>
          </button>
        </li>
      </ul>
    </div>

  )
}
export default Navbar
