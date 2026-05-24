import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getSupabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import * as storageService from './storage.service.js';

const COLS = 2;
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 40;
const CELL_WIDTH = (PAGE_WIDTH - MARGIN * 2) / COLS;
const CELL_HEIGHT = 280;

interface SlotRow {
  display_name: string | null;
  portrait_url: string | null;
  quote: string | null;
  sort_key: number;
}

/**
 * Builds portrait-grid PDF for an edition and uploads to yearbook-pdfs.
 */
export async function buildEditionPdf(editionId: string): Promise<void> {
  const { data: edition } = await getSupabase()
    .from('yearbook_editions')
    .select('id, title, pdf_cache_version')
    .eq('id', editionId)
    .maybeSingle();

  if (!edition) return;

  await getSupabase()
    .from('yearbook_editions')
    .update({ pdf_build_status: 'building', updated_at: new Date().toISOString() })
    .eq('id', editionId);

  try {
    const { data: slots } = await getSupabase()
      .from('yearbook_slots')
      .select('display_name, portrait_url, quote, sort_key')
      .eq('edition_id', editionId)
      .eq('include_in_yearbook', true)
      .order('sort_key')
      .order('display_name');

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let col = 0;
    let row = 0;
    const slotsList = (slots ?? []) as SlotRow[];

    for (let i = 0; i < slotsList.length; i++) {
      const slot = slotsList[i]!;
      if (row > 0 && col === 0 && row * CELL_HEIGHT + CELL_HEIGHT > PAGE_HEIGHT - MARGIN) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        row = 0;
        col = 0;
      }

      const x = MARGIN + col * CELL_WIDTH;
      const y = PAGE_HEIGHT - MARGIN - (row + 1) * CELL_HEIGHT;

      if (slot.portrait_url) {
        try {
          const portraitPath = storageService.extractPathFromUrl(
            slot.portrait_url,
            'yearbook-portraits',
          );
          const imgBytes = await storageService.downloadFile('yearbook-portraits', portraitPath);
          const isPng = imgBytes[0] === 0x89;
          const image = isPng
            ? await pdfDoc.embedPng(imgBytes)
            : await pdfDoc.embedJpg(imgBytes);
          const dims = image.scale(1);
          const maxW = CELL_WIDTH - 20;
          const maxH = 140;
          const scale = Math.min(maxW / dims.width, maxH / dims.height, 1);
          const w = dims.width * scale;
          const h = dims.height * scale;
          page.drawImage(image, {
            x: x + (CELL_WIDTH - w) / 2,
            y: y + CELL_HEIGHT - h - 50,
            width: w,
            height: h,
          });
        } catch (err) {
          logger.warn({ err, editionId, slot }, 'Yearbook portrait embed failed');
        }
      }

      const name = slot.display_name ?? 'Member';
      page.drawText(name.slice(0, 40), {
        x: x + 10,
        y: y + 30,
        size: 12,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });

      if (slot.quote) {
        const quote =
          slot.quote.length > 120 ? `${slot.quote.slice(0, 117)}...` : slot.quote;
        page.drawText(`"${quote}"`, {
          x: x + 10,
          y: y + 10,
          size: 9,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      col++;
      if (col >= COLS) {
        col = 0;
        row++;
      }
    }

    if (slotsList.length === 0) {
      page.drawText(edition.title, {
        x: MARGIN,
        y: PAGE_HEIGHT / 2,
        size: 18,
        font: fontBold,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const storagePath = `${editionId}/yearbook-v${edition.pdf_cache_version}.pdf`;
    await storageService.uploadPrivate(
      'yearbook-pdfs',
      storagePath,
      Buffer.from(pdfBytes),
      'application/pdf',
    );

    await getSupabase()
      .from('yearbook_editions')
      .update({
        pdf_storage_path: storagePath,
        pdf_built_at_version: edition.pdf_cache_version,
        pdf_generated_at: new Date().toISOString(),
        pdf_build_status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', editionId);
  } catch (err) {
    logger.error({ err, editionId }, 'Yearbook PDF build failed');
    await getSupabase()
      .from('yearbook_editions')
      .update({ pdf_build_status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', editionId);
  }
}

/**
 * Queues PDF rebuild without blocking the request.
 */
export function queuePdfRebuild(editionId: string): void {
  setImmediate(() => {
    void buildEditionPdf(editionId);
  });
}
