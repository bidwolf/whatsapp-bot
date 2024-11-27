import React, { type ReactNode } from "react"
import { AuthContext } from "../context/auth"
import api, { setAuthorizationToken } from "../../../services/api"

type AuthProviderProps = {
  children: ReactNode
}
const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (token) return
    const currentToken = localStorage.getItem('token')
    if (currentToken) {
      setAuthorizationToken(currentToken)
      setToken(currentToken)
    }
  }, [token])
  const signIn = React.useCallback(
    async (username: string, password: string): Promise<void> => {
      try {
        const response = await api.post('/auth/login', {
          username, password
        })
        if (response.status === 200) {
          const data = await response.data
          localStorage.setItem('token', data.token);
          setAuthorizationToken(data.token)
          setToken(data.token);
        }

      } catch (error) {
        console.log(error)
      }
    }, [])
  const signOut = React.useCallback(async (): Promise<void> => {
    //mock
    localStorage.removeItem('token')
    setToken(null)
  }, [])
  const contextValue = React.useMemo(() => ({
    token, signIn, signOut
  }), [token, signIn, signOut])
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}
export default AuthProvider
