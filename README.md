# Resumable-Upload
Express.js-based API for handling large file uploads by splitting them into smaller chunks

# 📁 Chunked File Upload API (Node.js + Express)

This repository provides a backend API built with **Node.js** and **Express** for handling large file uploads using chunking. It allows users to upload files in smaller parts (chunks), which are then reassembled on the server after all parts are uploaded. This method supports **resumable uploads** and is ideal for large files or unreliable network conditions.

## 🚀 Features

- Upload files in chunks using `multer`
- Store chunks with unique `uploadId` and `chunkIndex`
- Automatically merge chunks into the final file
- Track upload progress via metadata
- Simple RESTful endpoints for upload and status check

## 📦 Project Structure
.
├── routes
│ └── upload.js # Main chunked upload router
├── uploads/
│ ├── chunks/ # Temporary chunk storage
│ └── final files # Completed/merged files
├── server.js # Express app entry point
└── README.md # This file


## 🛠️ Setup

### Prerequisites

- Node.js (v14+)
- npm

### Installation

1. Clone the repository:

```bash
git clone https://github.com/SreeKrishna-K/Resumable-Upload.git

cd chunked-upload-api

npm install

node server.js

```

Open http://localhost:3000/ in browser.

## API Endpoints
1. Upload Chunk
POST /upload-chunk?uploadId=<id>&chunkIndex=<index>

Form Data:

file: File chunk (type: file)

fileName: Full name of the final file

totalChunks: Total number of chunks