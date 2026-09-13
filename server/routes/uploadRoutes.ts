import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../auth.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = Router();
router.use(requireAuth);

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// POST /api/upload
// Accepts base64 encoded image string, strictly verifies MIME and size, saves to server static directory
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { imageBase64, filename } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'No image data provided.',
      });
    }

    // Match MIME type header: must strictly be jpeg, png, or webp
    const matches = imageBase64.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
    if (!matches) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file format. Only JPG, JPEG, PNG, and WEBP image files are allowed. SVG and PDF are rejected.',
      });
    }

    const extRaw = matches[1].toLowerCase();
    const ext = extRaw === 'jpeg' ? 'jpg' : extRaw;
    const base64Data = matches[2];

    const buffer = Buffer.from(base64Data, 'base64');

    // Validate size (maximum 5MB)
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (buffer.length > MAX_SIZE_BYTES) {
      return res.status(400).json({
        success: false,
        error: 'Image exceeds maximum allowed size of 5 MB.',
      });
    }

    // Magic number / header validation for security
    // JPEG starts with FF D8 FF
    // PNG starts with 89 50 4E 47
    // WEBP starts with RIFF (52 49 46 46) ... WEBP (57 45 42 50)
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isWebp =
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;

    if (!isJpeg && !isPng && !isWebp) {
      return res.status(400).json({
        success: false,
        error: 'File content does not match a recognized safe image format.',
      });
    }

    // Generate safe unique filename
    const safeHash = crypto.randomBytes(16).toString('hex');
    const safeFilename = `evidence_${Date.now()}_${safeHash}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);

    fs.writeFileSync(filePath, buffer);

    const imageUrl = `/uploads/${safeFilename}`;

    return res.json({
      success: true,
      message: 'Image uploaded and verified successfully.',
      data: {
        url: imageUrl,
        filename: safeFilename,
        sizeBytes: buffer.length,
      },
    });
  } catch (error) {
    console.error('Upload handling error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process image upload.',
    });
  }
});

export default router;
