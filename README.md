<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/status-production-22c55e?style=for-the-badge&logo=vercel&logoColor=white">
    <img alt="Status" src="https://img.shields.io/badge/status-production-22c55e?style=for-the-badge&logo=vercel&logoColor=white">
  </picture>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript&logoColor=white">
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-8b5cf6?style=for-the-badge">
</p>

# AutoPost Agent

A production-ready autonomous system that generates captions, hashtags, images, slideshows, and videos — and publishes them across multiple social media platforms. This repository provides the core engine, platform dispatchers, queue management, and AI integration for fully automated content scheduling.

---

## Features

- **AI Content Generation** — Captions, hashtags, titles, image prompts, video scripts, and slideshows powered by Google Gemini and OpenRouter AI
- **Multi-Platform Publishing** — Publish to LinkedIn, Facebook, Instagram, X (Twitter), TikTok, and YouTube via OAuth
- **Queue Management** — Schedule, approve, queue, publish, retry with per-platform status tracking and detailed publish logs
- **Automation Rules** — Schedule-based or approval-triggered content generation and posting workflows
- **Image & Video Generation** — AI-generated visuals via Pollinations and Google AI, video stitching with FFmpeg
- **Asset Library** — Upload, tag, and manage media assets with brand association
- **Brand Management** — Multiple brands with custom colors, tone, language, and logo
- **Team Collaboration** — Role-based access (admin, editor, viewer) with team invitations
- **Analytics Dashboard** — Publish stats, success rates, queue health, and activity feed
- **Content Calendar** — Drag-and-drop scheduling with FullCalendar integration
- **Research & Planning** — AI-powered trend research, competitor analysis, and 30-day content planner
- **User Memory** — Learns writing style, emoji preference, caption length, CTA preferences, and favorite hashtags

---

## Architecture

```text
User / Automation Rule
         │
         ▼
    Queue Item ──► Approval (optional)
         │
         ▼
  Automation Worker
         │
         ├──► Publish Manager
         │        │
         │        ├──► Facebook Dispatcher
         │        ├──► LinkedIn Dispatcher
         │        ├──► Instagram Dispatcher
         │        ├──► X (Twitter) Dispatcher
         │        ├──► TikTok Dispatcher
         │        └──► YouTube Dispatcher
         │
         ├──► AI Engine
         │        ├──► Caption Generation
         │        ├──► Hashtag Generation
         │        ├──► Image Generation
         │        ├──► Script Generation
         │        └──► Video Generation
         │
         └──► Retry Manager
                  ├──► 30s backoff
                  ├──► 2m backoff
                  └──► 10m backoff
```

---

## Pipeline Flow

1. User creates a post or automation rule triggers generation
2. Queue item is created (status: `draft`)
3. Optional approval workflow (`pending_approval` → `approved` / `rejected`)
4. Automation worker picks up approved & due items
5. Publish manager dispatches to all target platforms in parallel
6. Per-platform state tracked in `platforms` JSONB column
7. Results logged in `publish_logs` with duration, response, error
8. Failed platforms retried with exponential backoff (OAuth errors never retried)

---

## Platform Status

| Platform   | OAuth Status | Publishing Status |
|------------|-------------|-------------------|
| LinkedIn   | ✅ Live     | ✅ Live |
| Facebook   | ✅ Configured | 🔄 App Review Submitted |
| Instagram  | ✅ Configured | ❌ Requires Business Verification |
| X (Twitter)| ✅ Configured | ✅ Free Tier (50 tweets/day) |
| TikTok     | ✅ Configured | ✅ Available |
| YouTube    | ✅ Configured | ✅ Available |

---

## Tech Stack

| Layer          | Technology |
|----------------|------------|
| Framework      | Next.js 16 (App Router) |
| Language       | TypeScript |
| Styling        | Tailwind CSS 4 + shadcn/ui + Base UI |
| Database       | Supabase (PostgreSQL) |
| Auth           | Supabase Auth |
| AI (Text)      | Google Gemini 2.5 Flash, OpenRouter (fallback models) |
| AI (Image)     | Pollinations AI, Google AI |
| AI (Video)     | Scene prompts → Pollinations frames → FFmpeg |
| Deployment     | Vercel |
| Calendar       | FullCalendar 6 |
| Charts         | Recharts |

---

## Project Structure

```
├── app/                          # Next.js App Router
│   ├── api/                      # REST API endpoints
│   │   ├── asset/upload/         # Media asset upload
│   │   ├── auth/[platform]/      # OAuth initiation & callbacks
│   │   ├── automation/worker/    # Central cron trigger
│   │   ├── chat/                 # Ghost AI chat
│   │   ├── competitor/           # Competitor analysis
│   │   ├── debug/                # Debug utilities
│   │   ├── generate/             # AI content generation
│   │   ├── planner/              # 30-day content planner
│   │   ├── publish/              # Platform publishing
│   │   ├── publish-logs/         # Publish log queries
│   │   ├── queue/retry/          # Retry failed platforms
│   │   ├── research/             # Trend research
│   │   └── teams/invitations/    # Team invites
│   ├── dashboard/                # Admin dashboard pages
│   │   ├── analytics/            # Stats & charts
│   │   ├── approval/             # Content approval
│   │   ├── assets/               # Media library
│   │   ├── automation/           # Automation rules
│   │   ├── brands/               # Brand management
│   │   ├── calendar/             # Content calendar
│   │   ├── chat/                 # AI assistant
│   │   ├── memory/               # User profile
│   │   ├── new-post/             # Content creation hub
│   │   ├── planner/              # 30-day planner
│   │   ├── posted/               # Published posts
│   │   ├── queue/                # Content queue
│   │   ├── research/             # Trend research
│   │   ├── settings/             # User settings
│   │   ├── social/               # Account connections
│   │   ├── teams/                # Team management
│   │   └── video-engine/         # Video generation
│   └── ...                       # Public pages
├── components/                   # Reusable UI components
├── hooks/                        # Custom React hooks
├── lib/                          # Core libraries
│   ├── ai-engine.ts              # Client-side AI facade
│   ├── ai-config.ts              # AI provider fallback chain
│   ├── ai-router.ts              # Per-task model routing
│   ├── image-provider.ts         # Image generation registry
│   ├── video-provider.ts         # Video generation registry
│   ├── oauth.ts                  # OAuth configuration per platform
│   ├── platforms.ts              # Platform definitions & capabilities
│   ├── supabase.ts               # Supabase client
│   ├── utils.ts                  # Utilities
│   ├── providers/                # Provider implementations
│   │   ├── facebook/             # Facebook OAuth + token management
│   │   ├── linkedin/             # LinkedIn OAuth + publish
│   │   ├── x/                    # X (Twitter) OAuth + publish
│   │   ├── tiktok/               # TikTok OAuth + publish
│   │   ├── youtube/              # YouTube OAuth + publish
│   │   ├── pollinations-image/   # Pollinations AI image provider
│   │   ├── google-image/         # Google AI image provider
│   │   └── openrouter-video/     # OpenRouter video provider
│   └── .../publish.ts            # Per-platform publish implementations
├── services/                     # Business logic
│   ├── publish-manager.ts        # Orchestrates multi-platform publishing
│   ├── platform-dispatcher.ts    # Routes to correct platform API
│   ├── retry-manager.ts          # Backoff retry logic
│   ├── capability-checker.ts     # Pre-publish media validation
│   ├── queue.ts                  # Queue item CRUD
│   ├── social.ts                 # Social account management
│   ├── automation.ts             # Automation rules
│   ├── automation-state.ts       # Automation state tracking
│   ├── asset.ts                  # Asset management
│   ├── brand.ts                  # Brand CRUD
│   ├── team.ts                   # Team management
│   ├── publisher.ts              # Legacy publisher wrapper
│   ├── analytics.ts              # Analytics queries
│   ├── log-service.ts            # Publish log service
│   └── ...                       # Other services
├── types/                        # TypeScript definitions
├── supabase/migrations/          # 22 sequential DB migrations
└── utils/                        # Utility functions
```

---

## Queue Output

Each queue item carries per-platform state in the `platforms` JSONB column:

```json
{
  "linkedin": {
    "status": "published",
    "published_at": "2026-07-18T10:00:00Z",
    "platform_post_id": "urn:li:share:abc123",
    "platform_url": "https://linkedin.com/feed/update/abc123"
  },
  "facebook": {
    "status": "failed",
    "error": "Page access token expired",
    "retry_count": 2
  },
  "instagram": {
    "status": "skipped",
    "error": "Image required for Instagram posts"
  }
}
```

---

## API Reference

### Content Generation

- `POST /api/generate` — Full content generation (caption, hashtags, image prompt, title)
- `POST /api/generate/image` — Generate image from topic + brand + platform
- `POST /api/generate/script` — Generate video script with scenes
- `POST /api/generate/video` — Generate full video
- `POST /api/generate/slideshow-images` — Generate slideshow image sequence

### Publishing

- `POST /api/automation/worker` — Trigger automation worker (cron endpoint)
- `POST /api/queue/retry` — Retry failed platforms for a queue item
- `GET /api/publish-logs?queueItemId=...` — Fetch publish logs

### Auth

- `GET /api/auth/[platform]` — Initiate OAuth flow
- `GET /api/auth/[platform]/callback` — OAuth callback handler

---

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase project (PostgreSQL DB)
- Google AI Studio API key and/or OpenRouter API key

### Environment Setup

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Providers
OPENROUTER_API_KEY=your_openrouter_key
GOOGLE_API_KEY=your_google_ai_key

# OAuth (configure at least one platform)
LINKEDIN_CLIENT_ID=your_linkedin_id
LINKEDIN_CLIENT_SECRET=your_linkedin_secret
X_CLIENT_ID=your_x_client_id
X_CLIENT_SECRET=your_x_client_secret
TIKTOK_CLIENT_ID=your_tiktok_key
TIKTOK_CLIENT_SECRET=your_tiktok_secret
YOUTUBE_CLIENT_ID=your_youtube_id
YOUTUBE_CLIENT_SECRET=your_youtube_secret
INSTAGRAM_CLIENT_ID=your_instagram_id
INSTAGRAM_CLIENT_SECRET=your_instagram_secret

# App
NEXT_PUBLIC_APP_URL=https://app.namunafilms.com
```

### Installation

```bash
git clone https://github.com/Namunafilms022/Autopost-agent-.git
cd Autopost-agent-
npm install
npm run build
npm start
```

### Database Migrations

```bash
# Apply all Supabase migrations in order
supabase migration up
```

---

## Running

### Development

```bash
npm run dev
```

The app runs locally at `https://localhost:3000` (HTTPS required for Meta OAuth).

### Production Build

```bash
npm run build
npm start
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HTTPS |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

---

## Testing

Run the test suite:

```bash
npm test
```

Tests cover queue operations, platform dispatchers, retry logic, capability validation, AI engine integration, and OAuth flows.

Currently: 22 sequential database migrations tested against Supabase.

---

## Roadmap

Current status:

- ✅ LinkedIn publishing (live)
- ✅ AI content generation (text + image + video)
- ✅ Queue management with per-platform state
- ✅ Automation rules engine
- ✅ Team collaboration
- ✅ Asset & brand management
- ✅ Research, planner & competitor analysis
- ✅ Calendar & analytics
- 🔄 Facebook App Review (submitted)
- 🔄 Instagram Business Verification
- 🔄 YouTube OAuth verification
- ⏳ Threads platform support
- ⏳ Rate limiting & caching layer for AI calls

---

## Screenshots

*Screenshots coming soon — dashboard, queue management, publishing flow, and analytics.*

---

## Deployment

The app is live at [app.namunafilms.com](https://app.namunafilms.com).

```bash
vercel deploy --prod
```

Environment variables are managed in the Vercel dashboard under the `autopost-agent` project.

---

## License

MIT

---

Version: v1.0.0-beta

Production-ready autonomous content scheduling and publishing system.
