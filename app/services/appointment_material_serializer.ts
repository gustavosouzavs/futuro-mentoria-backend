import type AppointmentMaterial from '#models/appointment_material'

export type SerializedMaterial = {
  id: string
  name: string
  url: string
  type: string
  uploadedAt: string
  isFile: boolean
  source: 'mentor' | 'student'
}

export function serializeAppointmentMaterial(m: AppointmentMaterial): SerializedMaterial {
  const url = m.diskPath ? `/api/material-files/${m.id}` : (m.url ?? '')
  return {
    id: String(m.id),
    name: m.name,
    url,
    type: m.type,
    uploadedAt: m.uploadedAt.toISO() ?? '',
    isFile: Boolean(m.diskPath),
    source: m.source,
  }
}
