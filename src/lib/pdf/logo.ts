import sharp from "sharp";
import { getObjectBuffer } from "@/lib/storage";

/**
 * Builds a data: URI for a company's logo so @react-pdf/renderer can embed it directly —
 * fetched via the S3 client (not STORAGE_PUBLIC_URL), since the server rendering the PDF
 * may not be able to reach the browser-facing public URL (e.g. the Dockerized app talks to
 * MinIO over its internal hostname, not the host's localhost port).
 *
 * SVG logos are stored and used as-is everywhere else (crisp on screen at any size), but
 * @react-pdf/renderer's <Image> only understands raster formats — so SVG is rasterized to
 * PNG here, at PDF-generation time only, rather than converting the stored file itself.
 */
export async function getCompanyLogoDataUri(company: {
  logoStorageKey: string | null;
  logoContentType: string | null;
}): Promise<string | null> {
  if (!company.logoStorageKey || !company.logoContentType) return null;
  const buffer = await getObjectBuffer(company.logoStorageKey);

  if (company.logoContentType === "image/svg+xml") {
    // Rasterize at a high density so small viewBoxes still come out sharp, then bound the
    // output size — the PDF only ever displays this at ~140x56pt, so this stays well above
    // print resolution without producing an unreasonably large embedded image.
    const pngBuffer = await sharp(buffer, { density: 300 })
      .resize({ width: 600, height: 240, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    return `data:image/png;base64,${pngBuffer.toString("base64")}`;
  }

  return `data:${company.logoContentType};base64,${buffer.toString("base64")}`;
}
