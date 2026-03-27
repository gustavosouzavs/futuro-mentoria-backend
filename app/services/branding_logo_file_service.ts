import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { copyFile, mkdir } from 'node:fs/promises'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import app from '@adonisjs/core/services/app'

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_BYTES = 3 * 1024 * 1024

export function assertAllowedLogoUpload(file: MultipartFile): void {
  if (!file.tmpPath) throw new Error('Arquivo não disponível após upload.')
  if ((file.size ?? 0) > MAX_BYTES) throw new Error('Logo muito grande. Máximo 3 MB.')
  const mime = file.headers?.['content-type']?.split(';')[0]?.trim().toLowerCase() ?? ''
  if (!mime || !ALLOWED_MIME.has(mime)) {
    throw new Error('Formato não permitido. Use PNG, JPG ou WEBP.')
  }
}

function inferExtFromMime(mime: string): string {
  if (mime === 'image/png') return '.png'
  if (mime === 'image/webp') return '.webp'
  return '.jpg'
}

/**
 * Salva a logo do estabelecimento em storage/branding/.
 * Retorna disk_path relativo ao storage/ (ex.: branding/logo.png).
 */
export async function storeBrandingLogo(file: MultipartFile): Promise<{ diskPath: string }> {
  assertAllowedLogoUpload(file)
  const mime = (file.headers?.['content-type']?.split(';')[0]?.trim().toLowerCase() ?? 'image/jpeg') as string
  const ext = file.extname?.toLowerCase() || inferExtFromMime(mime)

  const destDir = app.makePath('storage', 'branding')
  await mkdir(destDir, { recursive: true })

  const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`
  const fileName = `logo-${randomUUID()}${normalizedExt}`
  const destAbs = path.join(destDir, fileName)
  await copyFile(file.tmpPath!, destAbs)

  const relative = path.join('branding', fileName).replace(/\\/g, '/')
  return { diskPath: relative }
}

