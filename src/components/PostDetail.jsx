import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth/AuthContext'

export default function PostDetail({ post, onClose, onCambio, onCambioReacciones, onEditar }) {
  const { user, esAdmin } = useAuth()
  const [comentarios, setComentarios] = useState([])
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [reacciones, setReacciones] = useState(0)
  const [reaccione, setReaccione] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [editTexto, setEditTexto] = useState('')
  const [borrarId, setBorrarId] = useState(null)

  async function cargarComentarios() {
    const { data } = await supabase
      .from('comentarios')
      .select('*')
      .eq('publicacion_id', post.id)
      .order('creado_en', { ascending: true })
    setComentarios(data ?? [])
  }

  async function cargarReacciones() {
    const { data } = await supabase
      .from('reacciones')
      .select('autor_correo')
      .eq('publicacion_id', post.id)
    setReacciones(data?.length ?? 0)
    if (user) {
      setReaccione(Boolean(data?.some((r) => r.autor_correo === user.email)))
    } else {
      setReaccione(false)
    }
  }

  useEffect(() => {
    cargarComentarios()
    cargarReacciones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id, user?.email])

  async function toggleReaccion() {
    if (!user) return
    if (reaccione) {
      await supabase
        .from('reacciones')
        .delete()
        .eq('publicacion_id', post.id)
        .eq('autor_correo', user.email)
      setReaccione(false)
      setReacciones((r) => Math.max(0, r - 1))
    } else {
      await supabase.from('reacciones').insert({
        publicacion_id: post.id,
        autor_correo: user.email,
      })
      setReaccione(true)
      setReacciones((r) => r + 1)
    }
    if (onCambioReacciones) onCambioReacciones()
  }

  async function comentar(e) {
    e.preventDefault()
    if (!texto.trim()) return
    setCargando(true)
    const autorNombre =
      user?.user_metadata?.nombre || user.email.split('@')[0]
    const { error } = await supabase.from('comentarios').insert({
      publicacion_id: post.id,
      autor_correo: user.email,
      autor_nombre: autorNombre,
      contenido: texto.trim(),
    })
    setCargando(false)
    if (!error) {
      setTexto('')
      cargarComentarios()
    }
  }

  async function eliminar() {
    setCargando(true)
    await supabase.from('publicaciones').delete().eq('id', post.id)
    setCargando(false)
    onCambio()
    onClose()
  }

  async function guardarEdicion(c) {
    const texto = editTexto.trim()
    if (!texto) return
    setCargando(true)
    const { error } = await supabase
      .from('comentarios')
      .update({ contenido: texto })
      .eq('id', c.id)
      .eq('autor_correo', user.email)
    setCargando(false)
    if (!error) {
      setEditandoId(null)
      setEditTexto('')
      cargarComentarios()
    }
  }

  async function borrarComentario(c) {
    setCargando(true)
    await supabase
      .from('comentarios')
      .delete()
      .eq('id', c.id)
      .eq('autor_correo', user.email)
    setCargando(false)
    setBorrarId(null)
    cargarComentarios()
  }

  const fecha = new Date(post.creado_en).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const url = post.archivo_url || ''
  const viewUrl = /\.(ppt|pptx|doc|docx)$/i.test(url)
    ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`
    : url

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span className="tag" style={{ fontSize: '0.8rem' }}>
            Unidad {post.unidad} · Semana {post.semana}
          </span>
          <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: '1.2rem' }} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <h2 style={{ marginTop: 8 }}>{post.titulo}</h2>
        <div className="post-meta-tags">
          <span className="tag">{post.tipo}</span>
          <span className="tag">{post.asignatura}</span>
          <span className="tag">{post.periodo}</span>
          {post.etiquetas?.map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft)' }}>Publicado el {fecha}</p>
        {post.portada_url && <img className="portada" src={post.portada_url} alt="Portada" />}
        {post.resumen && <p style={{ margin: '10px 0' }}><b>{post.resumen}</b></p>}
        {post.contenido && <p style={{ whiteSpace: 'pre-wrap' }}>{post.contenido}</p>}
        {post.imagenes?.map((u) => (
          <img key={u} className="portada" src={u} alt="Evidencia" />
        ))}
        {post.videos?.map((u) => (
          <video key={u} className="portada" src={u} controls />
        ))}
        {post.archivo_url && (
          <p style={{ marginTop: 10 }}>
            <a className="archivo-link" href={viewUrl} target="_blank" rel="noreferrer">
              📄 Ver y descargar archivo del trabajo
            </a>
          </p>
        )}

        <div className="reaccion-row" style={{ marginTop: 12 }}>
          <button
            className={`btn ${reaccione ? 'btn-reactivo' : 'btn-outline'}`}
            onClick={toggleReaccion}
            title={user ? 'Me gusta este trabajo' : 'Inicia sesión para reaccionar'}
            disabled={!user}
          >
            👍 {reacciones}
          </button>
          {!user && (
            <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
              Inicia sesión para reaccionar.
            </span>
          )}
        </div>

        <div className="comments">
          <h3>Comentarios ({comentarios.length})</h3>
          {comentarios.length === 0 && (
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)' }}>Aún no hay comentarios. Sé el primero en aportar.</p>
          )}
          {comentarios.map((c) => (
            <div className="comment" key={c.id}>
              <div className="c-head">
                <span className="avatar-dot" style={{ width: 26, height: 26, fontSize: '0.72rem' }}>
                  {c.autor_nombre?.[0]?.toUpperCase() ?? '?'}
                </span>
                <span className="c-nombre">{c.autor_nombre}</span>
                <span className="c-fecha">
                  {new Date(c.creado_en).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
                {user?.email === c.autor_correo && editandoId !== c.id && borrarId !== c.id && (
                  <>
                    <button
                      className="btn btn-ghost"
                      style={{ marginLeft: 'auto', fontSize: '0.75rem' }}
                      onClick={() => {
                        setEditandoId(c.id)
                        setEditTexto(c.contenido)
                      }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '0.75rem', color: '#b91c1c' }}
                      onClick={() => setBorrarId(c.id)}
                    >
                      🗑 Eliminar
                    </button>
                  </>
                )}
                {user?.email === c.autor_correo && borrarId === c.id && (
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>¿Eliminar comentario?</span>
                    <button className="btn btn-primary" style={{ background: '#b91c1c', padding: '2px 10px', fontSize: '0.75rem' }} disabled={cargando} onClick={() => borrarComentario(c)}>
                      Sí
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '2px 10px', fontSize: '0.75rem' }} onClick={() => setBorrarId(null)}>
                      No
                    </button>
                  </span>
                )}
              </div>
              {editandoId === c.id ? (
                <textarea
                  rows={3}
                  className="comment-form"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={editTexto}
                  onChange={(e) => setEditTexto(e.target.value)}
                  autoFocus
                />
              ) : (
                <p>{c.contenido}</p>
              )}
              {editandoId === c.id && (
                <div className="form-actions" style={{ marginTop: 6 }}>
                  <button className="btn btn-primary" disabled={cargando || !editTexto.trim()} onClick={() => guardarEdicion(c)}>
                    Guardar
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setEditandoId(null)
                      setEditTexto('')
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ))}

          {user ? (
            <form className="comment-form" onSubmit={comentar}>
              <textarea
                rows={2}
                placeholder="Deja una sugerencia, pregunta o aporte…"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={cargando || !texto.trim()}>
                  Comentar
                </button>
              </div>
            </form>
          ) : (
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', marginTop: 8 }}>
              <a href="#" onClick={(e) => e.preventDefault()}>Inicia sesión</a> para comentar.
            </p>
          )}
        </div>

        {esAdmin && (
          <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className="btn"
              style={{ background: 'var(--cyan-light)', color: 'var(--cyan)' }}
              onClick={() => onEditar(post)}
            >
              ✏️ Editar trabajo
            </button>
            {confirmar ? (
              <div className="mensaje error" style={{ margin: 0 }}>
                ¿Seguro que deseas eliminar este trabajo para siempre?
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ background: '#b91c1c' }} onClick={eliminar} disabled={cargando}>
                    Sí, eliminar
                  </button>
                  <button className="btn btn-ghost" onClick={() => setConfirmar(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button className="btn btn-ghost" style={{ color: '#b91c1c' }} onClick={() => setConfirmar(true)}>
                🗑 Eliminar trabajo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}