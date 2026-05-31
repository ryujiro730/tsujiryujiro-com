/**
 * HEIC/HEIF ファイルを JPEG Blob に変換する（ブラウザ専用）
 * 1. createImageBitmap でネイティブ変換を試みる（Safari/iOS は HEIC をネイティブサポート）
 * 2. 失敗した場合は heic2any（WASM）にフォールバック
 */
export async function heicToBlob(file: File): Promise<Blob> {
  // --- 方法1: ブラウザのネイティブ HEIC サポートを利用 ---
  try {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
    bitmap.close()
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('canvas toBlob failed')), 'image/jpeg', 0.92)
    )
  } catch {
    // Safari 以外（Chrome 等）はここに落ちる
  }

  // --- 方法2: heic2any（WASM）---
  try {
    const heic2any = (await import('heic2any')).default
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
    return Array.isArray(result) ? result[0] : result
  } catch (e) {
    // heic2any は Error ではなく plain object を throw することがある
    const detail = e instanceof Error ? e.message : JSON.stringify(e)
    throw new Error(`HEIC変換失敗: ${detail}`)
  }
}

export function isHeic(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.(heic|heif)$/i.test(file.name)
  )
}

/**
 * Canvas を使って画像をリサイズ＋WebP変換する
 * @param file     元の画像ファイル
 * @param maxSize  長辺の最大ピクセル数（デフォルト 1200px）
 * @param quality  WebP品質 0〜1（デフォルト 0.85）
 */
export async function compressImage(
  file: File,
  maxSize = 1200,
  quality = 0.85,
): Promise<{ blob: Blob; ext: 'webp' }> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round(height * maxSize / width)
          width = maxSize
        } else {
          width = Math.round(width * maxSize / height)
          height = maxSize
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => resolve({ blob: blob ?? file, ext: 'webp' }),
        'image/webp',
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ blob: file, ext: 'webp' })
    }
    img.src = url
  })
}
