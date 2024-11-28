import React from "react";
import { useAuth } from "../hooks/useAuth";
import { useLocation, useNavigate, } from "react-router";

const Login = () => {
  const { token, signIn, loading: authLoading } = useAuth()
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const { state } = useLocation();
  const handleLoginSubmit: React.FormEventHandler<HTMLFormElement> = React.useCallback(async (e) => {
    e.preventDefault();
    setLoading(true)
    const form = new FormData(e.target as HTMLFormElement);
    const username = form.get('username') as string;
    const password = form.get('password') as string;
    await signIn(username, password)
    setLoading(false)
  }, [signIn]);
  if (authLoading) {
    return <p>Loading...</p>;
  }
  if (token) {
    navigate(state?.path || "/");
  }

  return <React.Suspense fallback={<p>carregando</p>}>
    <main className="w-full h-[100vh] bg-black flex justify-center flex-col items-center text-zinc-200">
      <section className="p-8 border-slate-600 shadow-sm shadow-white w-3/6 min-h-1/2 bg-white/4">
        <h1 className="text-3xl text-center text-primary-300">Faça login</h1>
        <form onSubmit={handleLoginSubmit} className="p-4 m-4 flex flex-col gap-4">
          <label className="text-md text-primary-300" id="username-label">
            Nome de usuário
          </label>
          <input aria-labelledby="username-label" className="p-2  text-zinc-800 placeholder:text-zinc-500" type="text" name="username" placeholder="Informe o nome de usuário" />
          <label className="text-md text-primary-300" id="username-password">
            Senha
          </label>
          <input aria-labelledby="password-label" className="p-2  text-zinc-800 placeholder:text-zinc-500" type="password" name="password" placeholder="Informe sua senha" />
          <div className="flex justify-end">
            <button type="submit" className="px-4 py-2 bg-[#8BC1EF] text-black font-semibold" disabled={loading}>
              {loading ? 'Carregando...' : 'login'}
            </button>
          </div>
        </form>
      </section>
    </main>
  </React.Suspense>;
}
export default Login
