import 'server-only'
import fs from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

const MM = 2.8346

/**
 * Stamp "Page X of Y" in the footer of every page. Done as a post-processing step because
 * react-pdf's dynamic `render` text does not run inside the Next.js server runtime.
 */
export async function stampPageNumbers(pdf: Uint8Array | Buffer): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdf)
  doc.registerFontkit(fontkit)
  const font = await doc.embedFont(await fs.readFile(path.join(process.cwd(), 'src', 'server', 'report', 'fonts', 'PlusJakartaSans-400.woff')), { subset: true })
  const pages = doc.getPages()
  const size = 7.5
  pages.forEach((page, i) => {
    const text = `Page ${i + 1} of ${pages.length}`
    const { width } = page.getSize()
    page.drawText(text, {
      x: width - 19 * MM - font.widthOfTextAtSize(text, size),
      y: 8 * MM + 9 * MM - 2.5 * MM - size - 0.6,
      size,
      font,
      color: rgb(0x5d / 255, 0x65 / 255, 0x75 / 255),
    })
  })
  return doc.save()
}
