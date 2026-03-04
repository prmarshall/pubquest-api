# PubQuest Storage System (Local CDN)

## Overview

PubQuest uses MinIO as a local S3-compatible object storage solution, simulating a CDN for development. All images (avatars, quest images, NPC images, etc.) are stored in MinIO buckets.

## Quick Start

### 1. Start MinIO

```bash
docker-compose up -d minio
```

MinIO will be available at:

- **API**: http://localhost:9000
- **Console UI**: http://localhost:9001
- **Default credentials**: minioadmin / minioadmin

### 2. Access MinIO Console

Visit http://localhost:9001 and login with:

- Username: `minioadmin`
- Password: `minioadmin`

### 3. Buckets

The following buckets are automatically created on application startup:

- `avatars` - User avatar images
- `quests` - Quest-related images
- `npcs` - NPC avatar images
- `venues` - Venue photos
- `items` - Item/inventory images

All buckets have public read access (simulating a CDN).

## API Endpoints

### Upload Image

```bash
POST /api/storage/upload/:bucket
Content-Type: multipart/form-data

# Example with curl
curl -X POST \
  -F "file=@/path/to/image.jpg" \
  http://localhost:3000/api/storage/upload/npcs
```

**Response:**

```json
{
  "message": "File uploaded successfully",
  "url": "http://localhost:9000/npcs/1234567890-abc123-filename.jpg",
  "bucket": "npcs",
  "fileName": "1234567890-abc123-filename.jpg",
  "size": 45678,
  "mimeType": "image/jpeg"
}
```

### List Images in Bucket

```bash
GET /api/storage/list/:bucket?prefix=optional-prefix

# Example
curl http://localhost:3000/api/storage/list/npcs
```

**Response:**

```json
{
  "bucket": "npcs",
  "count": 3,
  "files": [
    {
      "fileName": "1234567890-abc123-avatar.png",
      "url": "http://localhost:9000/npcs/1234567890-abc123-avatar.png"
    }
  ]
}
```

### Delete Image

```bash
DELETE /api/storage/:bucket/:fileName

# Example
curl -X DELETE http://localhost:3000/api/storage/npcs/1234567890-abc123-avatar.png
```

**Response:**

```json
{
  "message": "File deleted successfully",
  "bucket": "npcs",
  "fileName": "1234567890-abc123-avatar.png"
}
```

### Get Available Buckets

```bash
GET /api/storage/buckets

curl http://localhost:3000/api/storage/buckets
```

**Response:**

```json
{
  "buckets": ["avatars", "quests", "npcs", "venues", "items"]
}
```

## File Constraints

- **Max file size**: 5MB
- **Allowed types**: JPEG, PNG, GIF, WebP, SVG
- **Automatic features**:
  - Unique filename generation (timestamp + random hash)
  - Content-Type detection
  - Public read access

## Usage in CMS

The CMS includes an `ImageUpload` component for easy image uploads:

```tsx
import { ImageUpload } from "@/components/ImageUpload";

<ImageUpload
  bucket="npcs"
  currentImageUrl={formData.avatar_url}
  onImageUploaded={(url) => updateField("avatar_url", url)}
  label="Avatar Image"
/>;
```

## Configuration

Environment variables (in `.env`):

```bash
MINIO_ENDPOINT=localhost      # MinIO server host
MINIO_PORT=9000               # MinIO API port
MINIO_USE_SSL=false           # Use HTTPS (false for local)
MINIO_ROOT_USER=minioadmin    # MinIO admin username
MINIO_ROOT_PASSWORD=minioadmin # MinIO admin password
```

## Production Considerations

For production deployments:

1. **Use AWS S3** or **DigitalOcean Spaces** instead of MinIO
2. Update environment variables to point to production S3-compatible service
3. Enable SSL (`MINIO_USE_SSL=true`)
4. Use proper access keys (not default credentials)
5. Consider adding CloudFront or CDN in front of S3
6. Implement proper image optimization (resizing, compression)
7. Add virus scanning for uploaded files

## Troubleshooting

### MinIO container not starting

```bash
docker-compose logs minio
```

### Buckets not created

The buckets are created automatically when the backend starts. Check logs:

```bash
npm run dev
# Look for "✅ Created bucket: npcs" messages
```

### Can't access images

Make sure the bucket policy is set to public read. You can manually configure this in the MinIO console under "Buckets > [bucket-name] > Access Policy".

### CORS issues

MinIO is configured with the same CORS policy as the rest of the API. If you encounter CORS issues, ensure MinIO is accessed from the same origin or configure CORS in MinIO settings.

## Direct File Access

All uploaded files are directly accessible via HTTP:

```
http://localhost:9000/{bucket-name}/{file-name}
```

Example:

```
http://localhost:9000/npcs/1234567890-abc123-dragon-avatar.png
```

This simulates a CDN where files are publicly accessible via direct URLs.
