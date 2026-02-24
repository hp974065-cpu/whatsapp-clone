// ============================================
// Media Service
// ============================================
// Handles file uploads, validation, thumbnail
// generation, and serving media files.
// ============================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');

// Ensure upload directory exists
const uploadDir = config.media.uploadDir;
const thumbDir = path.join(uploadDir, 'thumbnails');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

// Allowed MIME types
const ALLOWED_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/quicktime'],
    audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/aac'],
    document: ['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'],
};

const ALL_ALLOWED_TYPES = Object.values(ALLOWED_TYPES).flat();

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    },
});

// Multer upload middleware
const upload = multer({
    storage,
    limits: { fileSize: config.media.maxFileSizeMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (ALL_ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} is not allowed`), false);
        }
    },
});

/**
 * Determine content type category from MIME type.
 */
function getContentType(mimetype) {
    for (const [type, mimes] of Object.entries(ALLOWED_TYPES)) {
        if (mimes.includes(mimetype)) return type;
    }
    return 'document';
}

/**
 * Generate thumbnail for image files.
 * @param {string} filePath - Path to the original image
 * @param {string} filename - Original filename
 * @returns {string|null} Path to generated thumbnail, or null
 */
async function generateThumbnail(filePath, filename) {
    try {
        const thumbFilename = `thumb_${filename}`;
        const thumbPath = path.join(thumbDir, thumbFilename);

        await sharp(filePath)
            .resize(200, 200, { fit: 'cover' })
            .jpeg({ quality: 70 })
            .toFile(thumbPath);

        return `/api/v1/media/thumbnails/${thumbFilename}`;
    } catch (err) {
        console.error('[Media] Thumbnail generation failed:', err.message);
        return null;
    }
}

/**
 * Process an uploaded file: get metadata, generate thumbnail if image.
 * @param {Express.Multer.File} file
 * @returns {{ mediaUrl, mediaThumbnail, contentType, mediaSize }}
 */
async function processUpload(file) {
    const contentType = getContentType(file.mimetype);
    const mediaUrl = `/api/v1/media/files/${file.filename}`;

    let mediaThumbnail = null;
    if (contentType === 'image') {
        mediaThumbnail = await generateThumbnail(file.path, file.filename);
    }

    return {
        mediaUrl,
        mediaThumbnail,
        contentType,
        mediaSize: file.size,
        originalName: file.originalname,
    };
}

module.exports = { upload, processUpload, uploadDir, thumbDir };
