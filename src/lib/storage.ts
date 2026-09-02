import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const bucket = process.env.STORAGE_BUCKET ?? "kite-attachments";

// Works unchanged against MinIO locally (docker-compose) or S3/R2 in production —
// only STORAGE_ENDPOINT/credentials differ between environments.
const s3 = new S3Client({
  region: process.env.STORAGE_REGION ?? "us-east-1",
  endpoint: process.env.STORAGE_ENDPOINT,
  forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? "",
  },
});

export function buildStorageKey(prefix: string, fileName: string) {
  const ext = fileName.includes(".") ? fileName.split(".").pop() : undefined;
  const id = randomUUID();
  return ext ? `${prefix}/${id}.${ext}` : `${prefix}/${id}`;
}

export async function uploadObject(params: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );
  return params.key;
}

export async function getObjectSignedUrl(key: string, expiresInSeconds = 3600) {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: expiresInSeconds }
  );
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * Fetches an object's bytes directly via the S3 client rather than a URL fetch. Needed
 * when the server itself embeds the file (e.g. a logo in a generated PDF) — the
 * browser-facing STORAGE_PUBLIC_URL isn't necessarily reachable from the server process
 * (e.g. it points at localhost:9010 on the host, unreachable from inside the app's own
 * Docker container, which talks to MinIO over the internal STORAGE_ENDPOINT instead).
 */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await result.Body?.transformToByteArray();
  return Buffer.from(bytes ?? []);
}

export function publicObjectUrl(key: string) {
  const base = process.env.STORAGE_PUBLIC_URL;
  return base ? `${base}/${key}` : key;
}
