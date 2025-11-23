# 📡 API Documentation

Complete reference for all API endpoints in the Instagram Auto-Poster system.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-app.vercel.app`

---

## 🔍 Scan Videos

Fetch all videos from the video server with their captions.

### Endpoint
```
GET /api/scan-videos
```

### Response
```json
{
  "success": true,
  "videos": [
    {
      "filename": "21.mp4",
      "videoUrl": "https://q.fronxx.com/videos/videos/21.mp4",
      "caption": "Amazing content! 🔥",
      "hasCaption": true
    }
  ],
  "count": 300,
  "source": "https://q.fronxx.com/videos/videos/"
}
```

### Example
```bash
curl http://localhost:3000/api/scan-videos
```

---

## 📅 Schedule Posts

### Schedule Single Post

```
POST /api/schedule
```

### Request Body
```json
{
  "filename": "21.mp4",
  "videoUrl": "https://q.fronxx.com/videos/videos/21.mp4",
  "caption": "My awesome video! 🎥",
  "scheduledFor": "2025-11-24T10:00:00Z"
}
```

### Response
```json
{
  "success": true,
  "job": {
    "id": "uuid-here",
    "filename": "21.mp4",
    "video_url": "https://...",
    "caption": "My awesome video! 🎥",
    "scheduled_for": "2025-11-24T10:00:00Z",
    "status": "pending",
    "created_at": "2025-11-23T02:00:00Z"
  }
}
```

### Example
```bash
curl -X POST http://localhost:3000/api/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "video.mp4",
    "videoUrl": "https://q.fronxx.com/videos/videos/video.mp4",
    "caption": "Check this out!",
    "scheduledFor": "2025-11-24T14:00:00Z"
  }'
```

---

### Bulk Schedule Posts

```
PUT /api/schedule
```

### Request Body
```json
{
  "videos": [
    {
      "filename": "21.mp4",
      "videoUrl": "https://q.fronxx.com/videos/videos/21.mp4",
      "caption": "First video"
    },
    {
      "filename": "C-23djt5BpT.mp4",
      "videoUrl": "https://...",
      "caption": "Second video"
    }
  ],
  "startDate": "2025-11-24T08:00:00Z",
  "postsPerDay": 3
}
```

### Response
```json
{
  "success": true,
  "scheduled": 300,
  "jobs": [...],
  "distribution": {
    "postsPerDay": 3,
    "hoursPerPost": 8,
    "totalDays": 100,
    "startDate": "2025-11-24T08:00:00Z",
    "endDate": "2026-03-03T16:00:00Z"
  }
}
```

### Example
```bash
curl -X PUT http://localhost:3000/api/schedule \
  -H "Content-Type: application/json" \
  -d @bulk-schedule.json
```

---

## 📋 Manage Jobs

### Get All Jobs

```
GET /api/jobs
GET /api/jobs?status=pending
GET /api/jobs?id=uuid
```

### Query Parameters
- `status` (optional): Filter by status (`pending`, `processing`, `published`, `failed`)
- `id` (optional): Get specific job by ID

### Response
```json
{
  "success": true,
  "jobs": [
    {
      "id": "uuid",
      "filename": "21.mp4",
      "video_url": "https://...",
      "caption": "My video",
      "scheduled_for": "2025-11-24T10:00:00Z",
      "status": "pending",
      "creation_id": null,
      "published_id": null,
      "error_message": null,
      "created_at": "2025-11-23T02:00:00Z",
      "updated_at": "2025-11-23T02:00:00Z"
    }
  ],
  "count": 150
}
```

### Examples
```bash
# Get all jobs
curl http://localhost:3000/api/jobs

# Get only pending jobs
curl http://localhost:3000/api/jobs?status=pending

# Get specific job
curl http://localhost:3000/api/jobs?id=uuid-here
```

---

### Delete Job

```
DELETE /api/jobs?id=uuid
```

### Response
```json
{
  "success": true,
  "message": "Job deleted successfully"
}
```

### Example
```bash
curl -X DELETE http://localhost:3000/api/jobs?id=uuid-here
```

---

### Update Job

```
PATCH /api/jobs?id=uuid
```

### Request Body
```json
{
  "scheduledFor": "2025-11-25T10:00:00Z",
  "status": "pending"
}
```

### Response
```json
{
  "success": true,
  "job": { /* updated job */ }
}
```

### Example
```bash
curl -X PATCH http://localhost:3000/api/jobs?id=uuid-here \
  -H "Content-Type: application/json" \
  -d '{"scheduledFor": "2025-11-25T10:00:00Z"}'
```

---

## 📊 Statistics

Get aggregate statistics about all jobs.

```
GET /api/stats
```

### Response
```json
{
  "success": true,
  "stats": {
    "total": 300,
    "pending": 280,
    "processing": 2,
    "published": 15,
    "failed": 3
  },
  "next": {
    "scheduledFor": "2025-11-24T10:00:00Z",
    "timeUntil": 45
  },
  "lastPublished": {
    "publishedAt": "2025-11-23T01:30:00Z"
  }
}
```

### Example
```bash
curl http://localhost:3000/api/stats
```

---

## 🚀 Publish Now

Immediately publish a pending post to Instagram.

```
POST /api/publish-now
```

### Request Body
```json
{
  "jobId": "uuid-here"
}
```

### Response (Success)
```json
{
  "success": true,
  "publishedId": "18028776543271957",
  "message": "Successfully published to Instagram",
  "instagramUrl": "https://www.instagram.com/p/18028776543271957/"
}
```

### Response (Error)
```json
{
  "success": false,
  "error": "Video processing failed on Instagram"
}
```

### Example
```bash
curl -X POST http://localhost:3000/api/publish-now \
  -H "Content-Type: application/json" \
  -d '{"jobId": "uuid-here"}'
```

### Publishing Workflow

1. Updates job status to `processing`
2. Creates Instagram media container
3. Polls status every 3 seconds (max 3 minutes)
4. Publishes when status is `READY`
5. Updates job status to `published` with Instagram post ID

---

## ⏰ Cron Worker

Automated worker endpoint that finds and publishes due posts.

```
GET /api/cron
```

### Response
```json
{
  "success": true,
  "processed": 3,
  "successful": 2,
  "failed": 1,
  "duration": "45231ms",
  "results": [
    {
      "jobId": "uuid-1",
      "filename": "21.mp4",
      "success": true,
      "publishedId": "18028776543271957"
    },
    {
      "jobId": "uuid-2",
      "filename": "video2.mp4",
      "success": false,
      "error": "Video processing failed"
    }
  ]
}
```

### Behavior

- Runs every minute (configured via Vercel Cron or local cron-worker)
- Finds jobs where `status = 'pending'` and `scheduled_for <= NOW()`
- Processes up to 5 jobs per run
- If video still processing, returns job to `pending` status for next run
- Updates successful jobs to `published` status

### Example
```bash
curl http://localhost:3000/api/cron
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common HTTP Status Codes

- `200` - Success
- `400` - Bad Request (missing parameters, validation error)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limits

### Instagram Graph API Limits

- **Posts per day**: ~25 per account
- **Processing time**: 30-180 seconds per video
- **Video requirements**:
  - Format: MP4 (H.264 codec)
  - Max duration: 60 seconds for reels
  - Max size: 100 MB
  - Min resolution: 540x960

### API Best Practices

1. **Cron frequency**: Run every minute (don't increase)
2. **Concurrent processing**: Max 5 videos per cron run
3. **Retry logic**: Failed jobs stay as `failed` (manual review required)
4. **Polling interval**: Check status every 3 seconds during processing

---

## Database Schema

### `scheduled_posts` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `filename` | TEXT | Video filename |
| `video_url` | TEXT | Public URL to video |
| `caption` | TEXT | Post caption (optional) |
| `scheduled_for` | TIMESTAMPTZ | When to publish |
| `status` | TEXT | Status: `pending`, `processing`, `published`, `failed` |
| `creation_id` | TEXT | Instagram container ID |
| `published_id` | TEXT | Instagram post ID after publishing |
| `error_message` | TEXT | Error details if failed |
| `created_at` | TIMESTAMPTZ | Record creation time |
| `updated_at` | TIMESTAMPTZ | Last update time |

---

## Complete Workflow Example

### 1. Scan Videos
```bash
curl http://localhost:3000/api/scan-videos > videos.json
```

### 2. Bulk Schedule
```bash
curl -X PUT http://localhost:3000/api/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "videos": [/* from videos.json */],
    "startDate": "2025-11-24T08:00:00Z",
    "postsPerDay": 3
  }'
```

### 3. Monitor Stats
```bash
watch -n 30 'curl -s http://localhost:3000/api/stats | jq'
```

### 4. Check Pending Jobs
```bash
curl http://localhost:3000/api/jobs?status=pending | jq
```

### 5. Manual Publish (Optional)
```bash
curl -X POST http://localhost:3000/api/publish-now \
  -H "Content-Type: application/json" \
  -d '{"jobId": "uuid-here"}'
```

### 6. Cron Auto-Publishes
The cron worker runs automatically every minute and publishes due posts.
