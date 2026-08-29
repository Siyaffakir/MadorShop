// middleware/upload.js — hardened image upload handling using UploadThing
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UTApi, UTFile } = require('uploadthing/server');

const utapi = new UTApi({
  token: process.env.UPLOADTHING_TOKEN || process.env.UPLOADTHING_SECRET,
});

const uploadDir = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

// Magic-byte signatures, checked independently of filename and declared Content-Type.
// Filenames and MIME headers are attacker-controlled metadata; only the actual bytes are trustworthy.
function detectImageSignature(buffer) {
  if (!buffer || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';

  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return 'image/png';

  if (
    (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61
  ) return 'image/gif';

  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return 'image/webp';

  return null;
}

const SIGNATURE_TO_EXTS = {
  'image/jpeg': new Set(['.jpg', '.jpeg']),
  'image/png': new Set(['.png']),
  'image/gif': new Set(['.gif']),
  'image/webp': new Set(['.webp']),
};

// Buffer in memory first so we can validate real bytes before uploading.
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    // Cheap upfront rejection on declared extension/MIME; the authoritative check is the
    // signature verification below, run once the full buffer is available.
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTS.has(ext) || !ALLOWED_MIMES.has(file.mimetype)) {
      const err = new Error('Invalid image type. Only JPEG, PNG, WEBP, and GIF images are permitted.');
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
}).single('image');

/**
 * Extracts UploadThing file key from a URL or key string
 */
function extractUploadThingKey(identifier) {
  if (!identifier || typeof identifier !== 'string') return null;
  if (identifier.startsWith('http://') || identifier.startsWith('https://')) {
    try {
      const url = new URL(identifier);
      if (
        url.hostname.includes('ufs.sh') ||
        url.hostname.includes('utfs.io') ||
        url.hostname.includes('uploadthing.com')
      ) {
        const parts = url.pathname.split('/').filter(Boolean);
        return parts[parts.length - 1] || null;
      }
    } catch {
      const parts = identifier.split('/').filter(Boolean);
      return parts[parts.length - 1] || null;
    }
  } else if (/^[a-zA-Z0-9_-]{20,}$/.test(identifier)) {
    return identifier;
  }
  return null;
}

/**
 * Express middleware: parses a single `image` field into memory, verifies its real
 * byte signature matches an allowed image format (independent of filename/MIME), then
 * uploads it to UploadThing cloud storage.
 * Populates req.file.filename with the CDN URL for seamless database persistence.
 */
function upload(req, res, next) {
  memoryUpload(req, res, async (err) => {
    if (err) return next(err);
    if (!req.file) return next();

    const ext = path.extname(req.file.originalname).toLowerCase();
    const signature = detectImageSignature(req.file.buffer);

    if (!signature || !SIGNATURE_TO_EXTS[signature].has(ext)) {
      const sigErr = new Error('File content does not match a valid image format. The file was rejected.');
      sigErr.status = 400;
      return next(sigErr);
    }

    try {
      const sanitizedBase = path.basename(req.file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanFileName = `${Date.now()}-${sanitizedBase || 'upload'}${ext}`;
      const utFile = new UTFile([req.file.buffer], cleanFileName, {
        type: signature || req.file.mimetype,
      });

      const response = await utapi.uploadFiles(utFile);

      if (response.error || !response.data) {
        const uploadErr = new Error(
          response.error?.message || 'Failed to upload image to cloud storage.'
        );
        uploadErr.status = 502;
        return next(uploadErr);
      }

      const fileUrl = response.data.ufsUrl || response.data.url;
      req.file.filename = fileUrl;
      req.file.url = fileUrl;
      req.file.key = response.data.key;
      delete req.file.buffer;

      next();
    } catch (uploadErr) {
      console.error('[UploadThing Error]', uploadErr);
      next(uploadErr);
    }
  });
}

upload.single = () => upload; // keeps route call sites (`upload.single('image')`) working unchanged

async function deleteUploadedFile(identifier) {
  if (!identifier || typeof identifier !== 'string') return;

  const utKey = extractUploadThingKey(identifier);
  if (utKey) {
    try {
      await utapi.deleteFiles(utKey);
    } catch (err) {
      console.error('[UploadThing] Failed to delete file key:', utKey, err.message);
    }
    return;
  }

  // Fallback for legacy local disk uploads
  try {
    const target = path.join(uploadDir, path.basename(identifier));
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
  } catch (err) {
    console.error('[Upload] Failed to clean up local file', identifier, err.message);
  }
}

module.exports = upload;
module.exports.deleteUploadedFile = deleteUploadedFile;
module.exports.extractUploadThingKey = extractUploadThingKey;

