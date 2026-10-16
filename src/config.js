export const UNIDADES = [
  { unidad: 1, titulo: 'Unidad I', semanas: [1, 2, 3, 4] },
  { unidad: 2, titulo: 'Unidad II', semanas: [6, 7, 8, 9] },
  { unidad: 3, titulo: 'Unidad III', semanas: [11, 12, 13, 14, 15] },
]

export const EXAMENES = {
  5: 'Examen Unidad I',
  10: 'Examen Unidad II',
  16: 'Examen Final',
}

export const TIPOS = ['Informe', 'Mapa mental', 'Presentación', 'Ensayo', 'Otro']

export const SEMANAS_CLASE = UNIDADES.reduce((acc, u) => acc + u.semanas.length, 0)

export const AUTOR = {
  nombre: 'Jhon Antony Pezo Tuanama',
  ciclo: 'IV',
  curso: 'Teoría General de Sistemas',
  docente: 'Ing. Dr. Alberto Alva Arévalo',
  periodo: '2026-II',
}