import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// ============================================================================
// Client-side PDF export.
//
// Strategy: NEVER use jsPDF's native text API for Hebrew (it has no bidi and no
// embedded Hebrew font). Instead we let the BROWSER render Hebrew (correct RTL +
// bidi) and capture it with html2canvas, then place the bitmap into the PDF.
//
//   * Visual slides (chart / word cloud / pin / instructions): snapshot the
//     #om-capture container at 2x for a crisp image.
//   * Open Ended (added later): render ALL cards into an OFF-SCREEN, full-height
//     container (no scroll clipping) and paginate the snapshot across pages, so
//     every answer is legible. addCanvasPaginated() below already supports this.
// ============================================================================

const A4 = { w: 210, h: 297 }; // mm, portrait
const MARGIN = 12;

async function snapshot(el: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });
}

/** Place a canvas, slicing it across pages when taller than one A4 page. */
function addCanvasPaginated(pdf: jsPDF, canvas: HTMLCanvasElement, first: boolean) {
  const contentW = A4.w - MARGIN * 2;
  const contentH = A4.h - MARGIN * 2;
  const pxPerMm = canvas.width / contentW;
  const pageHpx = contentH * pxPerMm;
  let renderedPx = 0;
  let pageNo = 0;

  while (renderedPx < canvas.height) {
    const sliceHpx = Math.min(pageHpx, canvas.height - renderedPx);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceHpx;
    const ctx = slice.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHpx, 0, 0, canvas.width, sliceHpx);

    if (!first || pageNo > 0) pdf.addPage();
    const sliceHmm = sliceHpx / pxPerMm;
    pdf.addImage(slice.toDataURL("image/png"), "PNG", MARGIN, MARGIN, contentW, sliceHmm);
    renderedPx += sliceHpx;
    pageNo++;
  }
}

/** Export one rendered slide container (e.g. the live chart) to a PDF file. */
export async function exportElementToPdf(
  el: HTMLElement,
  fileName: string
): Promise<void> {
  const canvas = await snapshot(el);
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  addCanvasPaginated(pdf, canvas, true);
  pdf.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
}
