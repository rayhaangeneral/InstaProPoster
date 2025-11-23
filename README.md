# 📸 Instagram Auto-Poster

Automated Instagram video posting system that scans videos from your server, schedules posts, and automatically publishes them using the Instagram Graph API.

![Status](https://img.shields.io/badge/status-active-success)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

- 🔍 **Auto Video Discovery** - Scans your video server and imports videos with captions
- 📅 **Smart Scheduling** - Bulk schedule hundreds of videos with automatic distribution
- 🤖 **Automated Publishing** - Cron worker auto-publishes videos on schedule
- 📊 **Real-time Dashboard** - Monitor all posts with status tracking
- ⚡ **Instant Publishing** - Publish any video immediately with one click
- 📈 **Statistics** - Track pending, processing, published, and failed posts
- 🎯 **Instagram Graph API** - Official, stable API (no risk of account blocking)

## 🚀 Quick Start

### Prerequisites

1. **Instagram Business Account** + Facebook Page
2. **Facebook Developer Account** with Instagram Graph API access
3. **Supabase Account** (free tier works)
4. **Video Server** with public access (e.g., `https://q.fronxx.com/videos/videos/`)

### Installation

```bash
# Clone or download this project
cd instapro

# Install dependencies
npm install

# Copy environment template
copy .env.local.example .env.local

# Edit .env.local with your credentials
notepad .env.local
```

### Configure Environment Variables

Edit `.env.local`:

```env
# Instagram Graph API Credentials
INSTAGRAM_ACCESS_TOKEN=your_long_lived_access_token
INSTAGRAM_USER_ID=your_instagram_business_user_id

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Video Server
VIDEO_SERVER_URL=https://q.fronxx.com/videos/videos/
```

### Set Up Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open SQL Editor
3. Run the commands from `supabase-schema.sql`

### Run Development Server

```bash
# Start Next.js dev server
npm run dev

# In another terminal, start the cron worker
npm run cron
```

Open [http://localhost:3000](http://localhost:3000)

## 📖 Quick Start

### 1. Scan Videos
Click **"Scan Video Server"** to fetch all videos from your server. Videos with matching `.txt` files will have captions imported automatically.

### 2. Schedule Posts
**Dashboard**: Select videos → Choose start date → Set posts/day → Click Schedule

**API**:
```bash
curl -X POST http://localhost:3000/api/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "video.mp4",
    "videoUrl": "https://q.fronxx.com/videos/videos/video.mp4",
    "caption": "My caption",
    "scheduledFor": "2025-11-24T10:00:00Z"
  }'
```

### 3. Publishing
- **Auto**: Cron worker publishes daily (configured in `vercel.json`)
- **Manual**: Click "Publish Now" on any post in the dashboard
- **Processing**: 30-180 seconds per video on Instagram

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│     React Dashboard (Browser)       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│        Next.js API Routes           │
│  /scan-videos  /schedule  /jobs     │
│  /stats  /publish-now  /cron        │
└──────┬──────────────────┬───────────┘
       │                  │
       ▼                  ▼
┌─────────────┐    ┌──────────────┐
│ Video Server│    │   Supabase   │
│ (q.fronxx)  │    │   Database   │
└─────────────┘    └──────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│      Instagram Graph API            │
│   Create → Process → Publish        │
└─────────────────────────────────────┘
```

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scan-videos` | GET | Fetch all videos from server |
| `/api/schedule` | POST | Schedule single post |
| `/api/schedule` | PUT | Bulk schedule multiple posts |
| `/api/jobs` | GET | Get all jobs (filter by status) |
| `/api/jobs?id=X` | DELETE | Delete a job |
| `/api/jobs?id=X` | PATCH | Update a job |
| `/api/stats` | GET | Get statistics |
| `/api/publish-now` | POST | Publish immediately |
| `/api/cron` | GET | Cron worker endpoint |

See [API-DOCS.md](./API-DOCS.md) for detailed documentation.

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Create `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron",
    "schedule": "* * * * *"
  }]
}
```

5. Deploy!

### Railway / Render

1. Create new project from GitHub
2. Add environment variables
3. Set up cron job pointing to `/api/cron`

## 🔧 Troubleshooting

### Videos Not Loading
- Check video server URL is accessible: `curl https://q.fronxx.com/videos/videos/`
- Verify CORS headers if needed
- Ensure videos are publicly accessible

### Instagram API Errors
- **Invalid token**: Regenerate long-lived access token
- **Video URL not accessible**: Instagram can't reach your server (check CORS/firewall)
- **Processing failed**: Check video format (MP4, H.264, max 60 seconds)
- **Quota exceeded**: Max 25 posts per day per Instagram account

### Cron Not Running
- **Local**: Ensure `npm run cron` is running
- **Vercel**: Check Vercel Dashboard → Cron Jobs
- **Test manually**: `curl http://localhost:3000/api/cron`

### Database Issues
- Verify Supabase credentials in `.env.local`
- Check table was created with `supabase-schema.sql`
- Review Supabase logs for errors

## 📊 Rate Limits

- **Instagram**: ~25 posts per day per account
- **Video Processing**: 30-180 seconds per video
- **Cron Frequency**: Every 1 minute (configurable)
- **Max Concurrent**: 5 videos per cron run

## 🔮 Future Enhancements

- [ ] Analytics dashboard with engagement metrics
- [ ] Auto-retry failed posts
- [ ] Multiple Instagram accounts support
- [ ] Caption templates with hashtags
- [ ] Preview before posting
- [ ] Webhook notifications
- [ ] Video thumbnail generation
- [ ] Best time to post analysis

## 📝 License

MIT

## 🙋 Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using Next.js, Supabase, and Instagram Graph API
