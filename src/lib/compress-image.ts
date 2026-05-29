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
