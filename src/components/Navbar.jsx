import { useAuth } from '../auth/AuthContext'

export default function Navbar({ onLogin, onLogout, onPublicar, onRegistro }) {
  const { user, esAdmin } = useAuth()
  const nombre =
    user?.user_metadata?.nombre ||
    (user?.email ? user.email.split('@')[0] : '')
  const iniciales = nombre[0]?.toUpperCase() ?? '?'

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <div className="brand">
          <img src="assets/img/logo-unsm.png" alt="Logo UNSM" />
          <div className="brand-text">
            <strong>Blog de Trabajo UNSM-FISI</strong>
            <small>UNSM · FISI — Tarapoto</small>
          </div>
        </div>
        <nav className="nav-actions">
          {user ? (
            <>
              <span className="avatar">
                <span className="avatar-dot">{iniciales}</span>
                {esAdmin ? (
                  <em>Admin · {nombre}</em>
                ) : (
                  <span>{nombre}</span>
                )}
              </span>
              {esAdmin && (
                <button className="btn btn-primary" onClick={onPublicar}>
                  ＋ Subir trabajo
                </button>
              )}
              <button className="btn btn-ghost" onClick={onLogout}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-outline" onClick={onRegistro}>
                Registrarse
              </button>
              <button className="btn btn-primary" onClick={onLogin}>
                Iniciar sesión
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}