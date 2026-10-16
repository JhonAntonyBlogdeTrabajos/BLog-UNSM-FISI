import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)

function mensajeAmigable(e) {
  if (!e?.message) return { message: 'Ocurrió un error inesperado.' }
  const m = e.message
  if (/already registered|already been registered|user already exists/i.test(m)) {
    return { message: 'Ese correo ya tiene una cuenta. Inicia sesión.' }
  }
  if (/invalid login credentials/i.test(m)) {
    return { message: 'Correo o contraseña incorrectos.' }
  }
  if (/password.*(least|minimum)|at least 6/i.test(m)) {
    return { message: 'La contraseña debe tener al menos 6 caracteres.' }
  }
  if (/email.*invalid|invalid email/i.test(m)) {
    return { message: 'Formato de correo no válido.' }
  }
  return { message: m }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [esAdmin, setEsAdmin] = useState(false)
  const [cargando, setCargando] = useState(true)

  function sincronizar(u) {
    setUser(u ?? null)
    setEsAdmin(false)
    if (!u) return

    supabase
      .from('perfiles')
      .select('es_admin')
      .eq('id', u.id)
      .maybeSingle()
      .then(({ data }) => {
        setEsAdmin(Boolean(data?.es_admin))
      })
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u) {
        supabase
          .from('perfiles')
          .select('es_admin')
          .eq('id', u.id)
          .maybeSingle()
          .then(({ data }) => setEsAdmin(Boolean(data?.es_admin)))
      }
      setCargando(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      sincronizar(session?.user ?? null)
    })

    return () => listener?.subscription.unsubscribe()
  }, [])

  async function iniciarSesion(correo, contrasena) {
    const { error } = await supabase.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    })
    return { error: error ? mensajeAmigable(error) : null }
  }

  async function crearCuenta(correo, contrasena, nombre) {
    const { data, error } = await supabase.auth.signUp({
      email: correo,
      password: contrasena,
      options: {
        data: { nombre: nombre || correo.split('@')[0] },
      },
    })

    if (error) {
      return { error: mensajeAmigable(error) }
    }

    const yaExiste =
      data?.user && (!data.user.identities || data.user.identities.length === 0)

    if (yaExiste) {
      return { error: { message: 'Ese correo ya tiene una cuenta. Inicia sesión.' } }
    }

    if (data?.user && data.user.identities?.length > 0) {
      return { error: null, session: Boolean(data.session) }
    }

    return { error: { message: 'Ese correo ya tiene una cuenta. Inicia sesión.' } }
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{ user, esAdmin, cargando, iniciarSesion, crearCuenta, cerrarSesion }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}