import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { UNIDADES, EXAMENES, SEMANAS_CLASE, TIPOS } from './config'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import LoginModal from './components/LoginModal'
import UploadModal from './components/UploadModal'
import PostDetail from './components/PostDetail'

export default function App() {
  const [publicaciones, setPublicaciones] = useState([])
  const [reacciones, setReacciones] = useState({})
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('todos')
  const [modales, setModales] = useState({
    login: false,
    registro: false,
    publicar: false,
    detalle: null,
    editar: null,
  })

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('publicaciones')
      .select('*')
      .order('creado_en', { ascending: false })
    setPublicaciones(data ?? [])

    await cargarReacciones()

    setCargando(false)
  }

  async function cargarReacciones() {
    const { data: reac } = await supabase.from('reacciones').select('publicacion_id')
    const conteo = {}
    if (reac) for (const r of reac) conteo[r.publicacion_id] = (conteo[r.publicacion_id] || 0) + 1
    setReacciones(conteo)
  }

  useEffect(() => {
    cargar()
  }, [])

  const datosUnidad = useMemo(() => {
    return UNIDADES.map((u) => {
      const semanas = u.semanas.map((semana) => {
        const posts = publicaciones
          .filter((p) => p.unidad === u.unidad && p.semana === semana)
          .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
        return { semana, posts }
      })
      const ultima = u.semanas[u.semanas.length - 1]
      const examenSemana = EXAMENES[ultima + 1] ? ultima + 1 : null
      return {
        ...u,
        semanas,
        examenSemana,
        examenLabel: examenSemana ? EXAMENES[examenSemana] : null,
      }
    })
  }, [publicaciones])

  const stats = {
    publicaciones: publicaciones.length,
    unidades: datosUnidad.length,
    semanas: SEMANAS_CLASE,
    examenes: Object.keys(EXAMENES).length,
  }

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return publicaciones.filter((p) => {
      const okQ =
        !q ||
        [p.titulo, p.resumen, p.contenido, p.asignatura, p.periodo, p.tipo, ...(p.etiquetas || [])]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      const okT = tipoFiltro === 'todos' || p.tipo === tipoFiltro
      return okQ && okT
    })
  }, [publicaciones, busqueda, tipoFiltro])

  const buscando = busqueda.trim() !== '' || tipoFiltro !== 'todos'

  return (
    <>
      <Navbar
        onLogin={() => setModales((m) => ({ ...m, login: true }))}
        onRegistro={() => setModales((m) => ({ ...m, registro: true }))}
        onLogout={() => supabase.auth.signOut()}
        onPublicar={() => setModales((m) => ({ ...m, publicar: true }))}
      />

      <Hero stats={stats} />

      <main className="timeline container" id="trabajos">
        <span className="page-label">Calendario académico</span>
        <h2>Mis trabajos por semana</h2>
        <p className="intro">
          El semestre tiene 16 semanas: 13 de clases y 3 de exámenes. Haz clic en
          cualquier trabajo para ver su contenido y comentar.
        </p>

        <div className="busqueda">
          <input
            type="search"
            placeholder="Buscar por título, asignatura o etiqueta…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
            <option value="todos">Todos los tipos</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {buscando && (
            <button className="btn btn-ghost" onClick={() => { setBusqueda(''); setTipoFiltro('todos') }}>
              Limpiar
            </button>
          )}
        </div>
        {buscando && (
          <p className="filtro-resumen">
            {filtradas.length} {filtradas.length === 1 ? 'resultado' : 'resultados'} encontrados
          </p>
        )}

        {cargando ? (
          <div className="loading">Cargando publicaciones…</div>
        ) : buscando ? (
          <div className="resultados">
            {filtradas.length === 0 ? (
              <p className="empty-week">Sin resultados para tu búsqueda.</p>
            ) : (
              filtradas.map((p) => (
                <div
                  key={p.id}
                  className="post-row"
                  onClick={() => setModales((m) => ({ ...m, detalle: p }))}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setModales((m) => ({ ...m, detalle: p }))
                  }}
                >
                  <span className="post-tipo">{p.tipo}</span>
                  <strong>{p.titulo}</strong>
                  <span className="post-asig">
                    Unidad {p.unidad} · Semana {p.semana} · {p.asignatura}
                  </span>
                  <span className="post-reacciones">👍 {(reacciones[p.id] || 0)}</span>
                </div>
              ))
            )}
          </div>
        ) : (
          datosUnidad.map((u) => (
            <section className="unit-group" key={u.unidad}>
              <div className="unit-head">
                <span className="badge-unit">Unidad {u.unidad}</span>
                <span className="unit-sub">
                  {u.semanas.length} semanas de clase ·{' '}
                  {publicaciones.filter((p) => p.unidad === u.unidad).length} publicaciones
                </span>
              </div>

              {u.semanas.map((s) => (
                <div className="u-week" key={s.semana}>
                  <div className="week-rail">
                    <span className="dot" />
                  </div>
                  <div className="week-body">
                    <div className="week-title">
                      <span className="week-label">Semana {s.semana}</span>
                      <span className="week-meta">
                        {s.posts.length} {s.posts.length === 1 ? 'trabajo' : 'trabajos'}
                      </span>
                    </div>
                    {s.posts.length === 0 ? (
                      <p className="empty-week">Sin publicaciones todavía.</p>
                    ) : (
                      <div className="post-list">
                        {s.posts.map((p) => (
                          <div
                            key={p.id}
                            className="post-row"
                            onClick={() => setModales((m) => ({ ...m, detalle: p }))}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setModales((m) => ({ ...m, detalle: p }))
                            }}
                          >
                            <span className="post-tipo">{p.tipo}</span>
                            <strong>{p.titulo}</strong>
                            <span className="post-asig">{p.asignatura}</span>
                            <span className="post-reacciones">👍 {(reacciones[p.id] || 0)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {u.examenSemana && (
                <div className="u-week exam-week">
                  <div className="week-rail">
                    <span className="dot exam-dot" />
                  </div>
                  <div className="week-body">
                    <div className="week-title">
                      <span className="week-label">Semana {u.examenSemana}</span>
                      <span className="week-meta exam-label">{u.examenLabel}</span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )))}
      </main>

      <section className="about" id="sobre">
        <div className="container">
          <h2>Sobre este espacio</h2>
          <p className="intro">
            Un portafolio académico para organizar, compartir y mejorar mis trabajos
            de clase durante el ciclo.
          </p>
          <div className="about-grid">
            <div className="about-card">
              <h3>📚 Organización</h3>
              <ul>
                <li>Trabajos ordenados por unidades y semanas.</li>
                <li>Archivos, evidencias e imágenes por publicación.</li>
                <li>Exámenes marcados en el calendario.</li>
              </ul>
            </div>
            <div className="about-card">
              <h3>💬 Participación</h3>
              <ul>
                <li>Comentarios con inicio de sesión.</li>
                <li>Aportes, preguntas y críticas constructivas.</li>
                <li>Solo el administrador publica y administra los trabajos.</li>
              </ul>
            </div>
            <div className="about-card">
              <h3>⚙️ Tecnología</h3>
              <ul>
                <li>Base de datos en Supabase (PostgreSQL).</li>
                <li>Archivos alojados en Supabase Storage.</li>
                <li>Desplegado en GitHub Pages.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-logos">
          <img src="assets/img/logo-unsm.png" alt="UNSM" />
          <img src="assets/img/logo-fisi.png" alt="FISI" />
        </div>
        <p>
          <b>Blog de Trabajo UNSM-FISI</b> · Universidad Nacional de San Martín
        </p>
        <p>Facultad de Ingeniería de Sistemas e Informática · Tarapoto, Perú</p>
        <p style={{ marginTop: 6, fontSize: '0.8rem', opacity: 0.75 }}>
          Proyecto académico · 2026
        </p>
      </footer>

      {modales.login && <LoginModal initialMode="login" onClose={() => setModales((m) => ({ ...m, login: false }))} />}
      {modales.registro && <LoginModal initialMode="signup" onClose={() => setModales((m) => ({ ...m, registro: false }))} />}
      {modales.publicar && (
        <UploadModal
          onClose={() => setModales((m) => ({ ...m, publicar: false }))}
          onPublicado={cargar}
        />
      )}
      {modales.detalle && (
        <PostDetail
          post={modales.detalle}
          onClose={() => setModales((m) => ({ ...m, detalle: null }))}
          onCambio={cargar}
          onCambioReacciones={cargarReacciones}
          onEditar={(p) => setModales((m) => ({ ...m, detalle: null, editar: p }))}
        />
      )}
      {modales.editar && (
        <UploadModal
          post={modales.editar}
          onClose={() => setModales((m) => ({ ...m, editar: null }))}
          onPublicado={cargar}
        />
      )}
    </>
  )
}