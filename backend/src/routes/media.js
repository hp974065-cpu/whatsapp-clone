// ============================================
// Media Routes
// ============================================

const express = require('express');
const router = express.Router();
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { upload, processUpload, uploadDir, thumbDir } = require('../services/media/mediaService');

/**
 * POST /api/v1/media/upload
 * Upload a file (image, video, audio, or document).
 * Returns media URL, thumbnail URL (if image), content type, and size.
 */
router.post('/upload', authenticate, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const result = await processUpload(req.file);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/v1/media/files/:filename
 * Serve uploaded files.
 */
router.get('/files/:filename', (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);
    res.sendFile(filePath, (err) => {
        if (err) res.status(404).json({ error: 'File not found' });
    });
});

/**
 * GET /api/v1/media/thumbnails/:filename
 * Serve generated thumbnails.
 */
router.get('/thumbnails/:filename', (req, res) => {
    const filePath = path.join(thumbDir, req.params.filename);
    res.sendFile(filePath, (err) => {
        if (err) res.status(404).json({ error: 'Thumbnail not found' });
    });
});

module.exports = router;
