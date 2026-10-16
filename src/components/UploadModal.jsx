import { useState } from 'react'
import { supabase } from '../supabase'
import { UNIDADES, TIPOS } from '../config'
import { useAuth } from '../auth/AuthContext'

function subirArchivo(carpeta, archivo) {
  const ruta = `${carpeta}/${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  return supabase.storage.from('archivos').upload(ruta, archivo).then(({ error }) => {
    if (error) throw error
    return supabase.storage.from('archivos').getPublicUrl(ruta).data.publicUrl
  })
}

export default function UploadModal({ onClose, onPublicado, post = null }) {
  const { user, esAdmin } = useAuth()
  const esEdicion = Boolean(post)
  const [form, setForm] = useState(() => {
    const unidad = post?.unidad ?? 1
    const semanas = UNIDADES.find((u) => u.unidad === unidad)?.semanas ?? [1, 2, 3, 4]
    return {
      unidad,
      semana: semanas.includes(post?.semana) ? post.semana : semanas[0],
      titulo: post?.titulo ?? '',
      tipo: post?.tipo ?? TIPOS[0],
      asignatura: post?.asignatura ?? 'Teoría General de Sistemas',
      periodo: post?.periodo ?? '2026-II',
      resumen: post?.resumen ?? '',
      contenido: post?.contenido ?? '',
      etiquetas: post?.etiquetas?.join(', ') ?? '',
      archivo: null,
      portada: null,
      imagenes: [],
      videos: [],
    }
  })
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  if (!esAdmin) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2>Sin permisos</h2>
          <p>Solo el administrador puede publicar y subir archivos.</p>
          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Entendido
            </button>
          </div>
        </div>
      </div>
    )
  }

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  const semanasDisponibles = UNIDADES.find((u) => u.unidad === Number(form.unidad))?.semanas ?? [1, 2, 3, 4]

  function cambiarUnidad(unidad) {
    const primeraSemana = UNIDADES.find((u) => u.unidad === unidad)?.semanas[0] ?? 1
    setForm((f) => ({ ...f, unidad, semana: primeraSemana }))
  }

  async function enviar(e) {
    e.preventDefault()
    setMensaje(null)
    if (!form.titulo.trim()) {
      setMensaje({ tipo: 'error', texto: 'El título es obligatorio.' })
      return
    }
    if (!semanasDisponibles.includes(Number(form.semana))) {
      setMensaje({ tipo: 'error', texto: 'Elige una semana válida para la unidad seleccionada.' })
      return
    }
    setCargando(true)
    try {
      const carpeta = `unidad-${form.unidad}/semana-${form.semana}`
      let archivoUrl = post?.archivo_url ?? null
      let portadaUrl = post?.portada_url ?? null
      const imagenes = post?.imagenes?.length ? [...post.imagenes] : []
      const videos = post?.videos?.length ? [...post.videos] : []

      if (form.archivo) archivoUrl = await subirArchivo(carpeta, form.archivo)
      if (form.portada) portadaUrl = await subirArchivo(carpeta, form.portada)
      for (const img of form.imagenes) imagenes.push(await subirArchivo(carpeta, img))
      for (const vid of form.videos) videos.push(await subirArchivo(carpeta, vid))

      const etiquetas = form.etiquetas
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const datos = {
        unidad: Number(form.unidad),
        semana: Number(form.semana),
        titulo: form.titulo.trim(),
        tipo: form.tipo,
        asignatura: form.asignatura.trim(),
        periodo: form.periodo.trim(),
        resumen: form.resumen.trim(),
        contenido: form.contenido.trim(),
        etiquetas,
        archivo_url: archivoUrl,
        portada_url: portadaUrl,
        imagenes,
        videos,
      }

      let error
      if (esEdicion) {
        const res = await supabase.from('publicaciones').update(datos).eq('id', post.id)
        error = res.error
      } else {
        const res = await supabase.from('publicaciones').insert({
          ...datos,
          autor_correo: user.email,
        })
        error = res.error
      }

      if (error) throw error
      onPublicado()
      onClose()
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al publicar.' })
      setCargando(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h2>{esEdicion ? 'Editar trabajo' : 'Publicar nuevo trabajo'}</h2>
        <form onSubmit={enviar}>
          <div className="form-grid">
            <div className="form-row">
              <label>Unidad</label>
              <select value={form.unidad} onChange={(e) => cambiarUnidad(Number(e.target.value))}>
                {UNIDADES.map((u) => (
                  <option key={u.unidad} value={u.unidad}>
                    Unidad {u.unidad} ({u.semanas.length} semanas)
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Semana</label>
              <select value={form.semana} onChange={(e) => set('semana', Number(e.target.value))}>
                {semanasDisponibles.map((w) => (
                  <option key={w} value={w}>
                    Semana {w}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <label>Título</label>
            <input value={form.titulo} onChange={(e) => set('titulo', e.target.value)} required />
          </div>
          <div className="form-grid">
            <div className="form-row">
              <label>Tipo de trabajo</label>
              <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
                {TIPOS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Asignatura</label>
              <input value={form.asignatura} onChange={(e) => set('asignatura', e.target.value)} />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-row">
              <label>Periodo</label>
              <input value={form.periodo} onChange={(e) => set('periodo', e.target.value)} />
            </div>
            <div className="form-row">
              <label>Etiquetas (separadas por coma)</label>
              <input value={form.etiquetas} onChange={(e) => set('etiquetas', e.target.value)} placeholder="teoría, informes" />
            </div>
          </div>
          <div className="form-row">
            <label>Resumen corto</label>
            <input value={form.resumen} onChange={(e) => set('resumen', e.target.value)} />
          </div>
          <div className="form-row">
            <label>Contenido / descripción</label>
            <textarea rows={4} value={form.contenido} onChange={(e) => set('contenido', e.target.value)} />
          </div>
          <div className="form-grid">
            <div className="form-row">
              <label>Archivo del trabajo</label>
              <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip" onChange={(e) => set('archivo', e.target.files[0])} />
              <p className="file-hint">PDF, Word, PowerPoint, Excel o ZIP.</p>
            </div>
            <div className="form-row">
              <label>Portada (opcional)</label>
              <input type="file" accept="image/*" onChange={(e) => set('portada', e.target.files[0])} />
              <p className="file-hint">JPG, PNG o WebP.</p>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-row">
              <label>Imágenes adicionales (opcional)</label>
              <input type="file" accept="image/*" multiple onChange={(e) => set('imagenes', Array.from(e.target.files))} />
            </div>
            <div className="form-row">
              <label>Videos (opcional)</label>
              <input type="file" accept="video/*" multiple onChange={(e) => set('videos', Array.from(e.target.files))} />
            </div>
          </div>
          {mensaje && <div className={`mensaje ${mensaje.tipo}`}>{mensaje.texto}</div>}
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={cargando}>
              {cargando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Publicar trabajo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}