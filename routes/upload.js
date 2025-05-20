const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Directory where chunks and completed files will be stored
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const CHUNKS_DIR = path.join(UPLOAD_DIR, 'chunks');

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(CHUNKS_DIR)) {
    fs.mkdirSync(CHUNKS_DIR, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Get uploadId from query params instead of body
        const uploadId = req.query.uploadId;
        
        if (!uploadId) {
            return cb(new Error('Upload ID is required'));
        }

        const uploadDir = path.join(CHUNKS_DIR, uploadId);
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Get chunkIndex from query params instead of body
        const chunkIndex = req.query.chunkIndex;
        if (!chunkIndex) {
            return cb(new Error('Chunk index is required'));
        }
        cb(null, `chunk-${chunkIndex}`);
    }
});

const upload = multer({ storage: storage });

// API endpoint to handle chunk uploads
router.post('/upload-chunk', upload.single('file'), async (req, res) => {
    try {
        // Extract data from both query params and request body
        const uploadId = req.query.uploadId;
        const chunkIndex = req.query.chunkIndex;
        const { fileName, totalChunks } = req.body;
        
        console.log('Request parameters:', { 
            uploadId, 
            chunkIndex, 
            fileName, 
            totalChunks,
            file: req.file ? 'Present' : 'Missing'
        });
        
        if (!fileName || !uploadId || chunkIndex === undefined || totalChunks === undefined || !req.file) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }
        console.log('Before saving metadata');
        // Save metadata about this upload if needed
        saveUploadMetadata(uploadId, fileName, parseInt(totalChunks));
        console.log('After saving metadata');
        
        // Check if all chunks have been uploaded
        const uploadDir = path.join(CHUNKS_DIR, uploadId);
        const uploadedChunks = fs.readdirSync(uploadDir)
            .filter(file => file.startsWith('chunk-'))
            .length;
            
        const isComplete = uploadedChunks === parseInt(totalChunks);
        
        // If all chunks are uploaded, combine them
        if (isComplete) {
            await combineChunks(uploadId, fileName, parseInt(totalChunks));
        }
        
        // Return success
        return res.status(200).json({
            success: true,
            chunkIndex: parseInt(chunkIndex),
            isComplete,
            message: 'Chunk uploaded successfully'
        });
    } catch (error) {
        console.error('Error handling chunk upload:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error processing chunk'
        });
    }
});

// Save metadata about the upload
function saveUploadMetadata(uploadId, fileName, totalChunks) {
    console.log(uploadId, fileName, totalChunks);
    const metadataPath = path.join(CHUNKS_DIR, uploadId, 'metadata.json');
    
    // Only create if it doesn't exist
    if (!fs.existsSync(metadataPath)) {
        const metadata = {
            fileName,
            totalChunks,
            uploadId,
            createdAt: new Date().toISOString()
        };
        
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }
}

// Combine all chunks into a single file
async function combineChunks(uploadId, fileName, totalChunks) {
    const uploadDir = path.join(CHUNKS_DIR, uploadId);
    const outputPath = path.join(UPLOAD_DIR, fileName);
    
    // Create write stream for the output file
    const outputStream = fs.createWriteStream(outputPath);
    
    try {
        // Process chunks in order
        for (let i = 0; i < totalChunks; i++) {
            const chunkPath = path.join(uploadDir, `chunk-${i}`);
            
            // Make sure this chunk exists
            if (!fs.existsSync(chunkPath)) {
                throw new Error(`Chunk ${i} is missing`);
            }
            
            // Read the chunk and append to output file
            const chunkData = fs.readFileSync(chunkPath);
            outputStream.write(chunkData);
        }
        
        // Close the stream
        outputStream.end();
        
        // Wait for stream to finish
        await new Promise((resolve, reject) => {
            outputStream.on('finish', resolve);
            outputStream.on('error', reject);
        });
        
        console.log(`File combined successfully: ${fileName}`);
        
        // Optionally delete the chunks after successful combination
        // fs.rmSync(uploadDir, { recursive: true, force: true });
        
        return outputPath;
    } catch (error) {
        // Close the stream in case of error
        outputStream.end();
        console.error('Error combining chunks:', error);
        throw error;
    }
}

// API endpoint to check upload status
router.get('/upload-status/:uploadId', (req, res) => {
    try {
        const { uploadId } = req.params;
        const uploadDir = path.join(CHUNKS_DIR, uploadId);
        
        if (!fs.existsSync(uploadDir)) {
            return res.status(404).json({
                success: false,
                message: 'Upload not found'
            });
        }
        
        // Read metadata
        const metadataPath = path.join(uploadDir, 'metadata.json');
        if (!fs.existsSync(metadataPath)) {
            return res.status(404).json({
                success: false,
                message: 'Upload metadata not found'
            });
        }
        
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        const uploadedChunks = fs.readdirSync(uploadDir)
            .filter(file => file.startsWith('chunk-'))
            .length;
            
        return res.status(200).json({
            success: true,
            fileName: metadata.fileName,
            totalChunks: metadata.totalChunks,
            uploadedChunks,
            isComplete: uploadedChunks === metadata.totalChunks,
            uploadId
        });
    } catch (error) {
        console.error('Error checking upload status:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error checking upload status'
        });
    }
});

module.exports = router;