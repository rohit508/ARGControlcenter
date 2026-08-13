import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";

export const UPLOAD_DIR = path.join(__dirname, "../../uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function sanitize(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-100);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}-${sanitize(file.originalname)}`),
});

export const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
