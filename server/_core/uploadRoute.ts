/**
 * POST /api/upload — multipart file upload endpoint
 * Accepts image files (PNG, JPG, WebP, GIF) up to 5MB.
 * Auth: Bearer token (staff JWT) required.
 * Returns: { url: "/manus-storage/..." }
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import { extractBearerToken, verifyStaffToken } from "../lib/auth";
import { storagePut } from "../storage";

const ALLOWED_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only PNG, JPG, WebP, GIF allowed.`));
    }
  },
});

export function registerUploadRoute(app: import("express").Express) {
  const router = Router();

  router.post(
    "/api/upload",
    // Auth middleware
    async (req: Request, res: Response, next) => {
      try {
        const token = extractBearerToken(req.headers.authorization);
        if (!token) {
          res.status(401).json({ error: "Authorization required" });
          return;
        }
        const staff = await verifyStaffToken(token);
        if (!staff?.staffId) {
          res.status(401).json({ error: "Invalid token" });
          return;
        }
        (req as any).staff = staff;
        next();
      } catch (err) {
        res.status(401).json({ error: "Invalid or expired token" });
      }
    },
    // Multer middleware
    upload.single("file"),
    // Handler
    async (req: Request, res: Response) => {
      try {
        const file = req.file;
        if (!file) {
          res.status(400).json({ error: "No file provided" });
          return;
        }

        // Generate a unique key for the file
        const ext = file.originalname.split(".").pop()?.toLowerCase() || "png";
        const sanitizedName = file.originalname
          .replace(/\.[^.]+$/, "")
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .slice(0, 50);
        const timestamp = Date.now();
        const relKey = `menu-uploads/${timestamp}-${sanitizedName}.${ext}`;

        // Upload to S3 via storagePut
        const { url } = await storagePut(relKey, file.buffer, file.mimetype);

        res.json({ url });
      } catch (err: any) {
        console.error("[Upload] Error:", err.message);
        res.status(500).json({ error: err.message || "Upload failed" });
      }
    }
  );

  // Error handler for multer errors
  router.use("/api/upload", (err: any, _req: Request, res: Response, _next: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: "File too large. Maximum size is 5MB." });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
  });

  app.use(router);
}
