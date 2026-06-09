// server/lib/gcs.ts
// Google Cloud Storage helper for uploading menu images and other assets.
// Uses the @google-cloud/storage client. Requires the service account key to be
// available via GOOGLE_APPLICATION_CREDENTIALS env var or GCLOUD_KEY (base64).

import { Storage } from "@google-cloud/storage";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Initialise storage client. If a raw JSON key is provided via GCLOUD_KEY we
// create a temporary file and let the client load it.
function getStorageClient(): Storage {
  const keyBase64 = process.env.GCLOUD_KEY;
  if (keyBase64) {
    // Decode base64 to JSON file in a tmp directory inside the project.
    const keyJson = Buffer.from(keyBase64, "base64").toString("utf8");
    const tmpPath = path.resolve(__dirname, "../.gcs-key.json");
    // Write synchronously – this runs once at startup.
    // eslint-disable-next-line node/no-sync
    require("fs").writeFileSync(tmpPath, keyJson, { mode: 0o600 });
    return new Storage({ keyFilename: tmpPath });
  }
  // Fall back to Application Default Credentials.
  return new Storage();
}

const storage = getStorageClient();
const bucketName = process.env.GCS_BUCKET || "hibi-pos-dev";
const bucket = storage.bucket(bucketName);

/**
 * Upload a file buffer to GCS.
 * @param buffer   File data buffer.
 * @param filename Original filename (used for extension).
 * @param folder   Optional folder inside the bucket.
 * @returns Public URL of the uploaded file.
 */
export async function uploadToGcs(
  buffer: Buffer,
  filename: string,
  folder?: string,
): Promise<string> {
  const ext = path.extname(filename);
  const id = uuidv4();
  const destination = folder ? `${folder}/${id}${ext}` : `${id}${ext}`;
  const file = bucket.file(destination);

  await file.save(buffer, {
    resumable: false,
    metadata: { contentType: getMimeType(ext) },
    public: true,
  });

  // Return a public URL. GCS buckets are publicly readable when "public" flag is set.
  return `https://storage.googleapis.com/${bucketName}/${destination}`;
}

function getMimeType(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

export default uploadToGcs;
