import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { copyFile, mkdir } from 'node:fs/promises'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import app from '@adonisjs/core/services/app'

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
])

const MAX_BYTES = 20 * 1024 * 1024

export function inferMaterialType(ext: string): 'pdf' | 'doc' | 'link' | 'other' {
  const e = ext.replace(/^\./, '').toLowerCase()
  if (e === 'pdf') return 'pdf'
  if (['doc', 'docx', 'odt', 'txt'].includes(e)) return 'doc'
  return 'other'
}

export function assertAllowedUpload(file: MultipartFile): void {
  if (!file.tmpPath) {
    throw new Error('Arquivo não disponível após upload.')
  }
  if ((file.size ?? 0) > MAX_BYTES) {
    throw new Error('Arquivo muito grande. Máximo 20 MB.')
  }
  const mime = file.headers?.['content-type']?.split(';')[0]?.trim().toLowerCase() ?? ''
  if (mime && !ALLOWED_MIME.has(mime)) {
    throw new Error('Tipo de arquivo não permitido. Use PDF, Word, imagem ou texto.')
  }
}

/**
 * Move multipart file into storage/appointment_materials/{appointmentId}/.
 * Returns disk_path relative to storage/ (e.g. appointment_materials/1/uuid.pdf).
 */
export async function storeMaterialMultipart(
  file: MultipartFile,
  appointmentId: number
): Promise<{ diskPath: string; displayName: string; materialType: ReturnType<typeof inferMaterialType> }> {
  assertAllowedUpload(file)
  const extFromClient = file.extname
  const fallbackExt = path.extname(file.clientName || '') || ''
  const ext = (extFromClient || fallbackExt || '').toLowerCase()
  if (!ext || ext.length > 10) {
    throw new Error('Não foi possível identificar a extensão do arquivo.')
  }

  const destDir = app.makePath('storage', 'appointment_materials', String(appointmentId))
  await mkdir(destDir, { recursive: true })
  const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`
  const fileName = `${randomUUID()}${normalizedExt}`
  const destAbs = path.join(destDir, fileName)
  await copyFile(file.tmpPath!, destAbs)

  const relative = path.join('appointment_materials', String(appointmentId), fileName).replace(/\\/g, '/')

  return {
    diskPath: relative,
    displayName: file.clientName || fileName,
    materialType: inferMaterialType(ext),
  }
}
