import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { renderReportHtml, type ReportData } from './template';

/** Inline the Fabric lockup so the generated PDF carries its own assets. */
export async function logoDataUri(path: string): Promise<string> {
  const buf = await readFile(path);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

export interface RenderOptions {
  /** Where to write the PDF. */
  outPath: string;
  /** Also write the intermediate HTML, for debugging a layout. */
  htmlPath?: string;
}

/**
 * Render the report to PDF with headless Chromium.
 *
 * Pages are laid out as explicit A4 sections in the HTML rather than relying on
 * automatic pagination, so a page break never lands in the middle of a figure.
 * `printBackground` is required: the brand gradients and tinted panels are
 * backgrounds, and Chromium drops them by default.
 */
export async function renderPdf(data: ReportData, opts: RenderOptions): Promise<void> {
  const html = renderReportHtml(data);

  if (opts.htmlPath) {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(opts.htmlPath, html, 'utf8');
  }

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    // Let fontconfig settle before measuring text, or the first page can
    // paginate against fallback metrics.
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: opts.outPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
  } finally {
    await browser.close();
  }
}
