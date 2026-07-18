# AutoPost Agent

An autonomous content scheduling and publishing system that generates captions, hashtags, images, slideshows, and videos — and posts them across multiple social media platforms.

## Features

- **AI Content Generation** — Captions, hashtags, titles, image prompts, video scripts, and slideshows powered by Google Gemini and OpenRouter AI
- **Multi-Platform Publishing** — Publish to LinkedIn, Facebook, Instagram, X (Twitter), TikTok, and YouTube via OAuth
- **Queue Management** — Schedule, approve, queue, publish, retry with per-platform status tracking and publish logs
- **Automation Rules** — Schedule-based or approval-triggered content generation and posting workflows
- **Image & Video Generation** — AI-generated visuals via Pollinations and Google AI, video stitching with FFmpeg
- **Asset Library** — Upload, tag, and manage media assets with brand association
- **Brand Management** — Multiple brands with custom colors, tone, language, and logo
- **Team Collaboration** — Role-based access (admin, editor, viewer) with team invitations
- **Analytics Dashboard** — Publish stats, success rates, queue health, and activity feed
- **Content Calendar** — Drag-and-drop scheduling with FullCalendar integration
- **Research & Planning** — AI-powered trend research, competitor analysis, and 30-day content planner
- **User Memory** — Saves writing style, emoji preference, caption length, CTA preferences, and favorite hashtags for personalized content generation

## Tech Stack

| Layer          | Technology |
|----------------|------------|
| Framework      | Next.js 16 (App Router) |
| Language       | TypeScript |
| Styling        | Tailwind CSS 4 + shadcn/ui |
| Database       | Supabase (PostgreSQL) |
| Auth           | Supabase Auth |
| AI             | Google Gemini 2.5 Flash, OpenRouter (fallback models) |
| Image Gen      | Pollinations AI, Google AI |
| Video Gen      | AI scene prompts → Pollinations frames → FFmpeg |
| Deployment     | Vercel |
| Calendar       | FullCalendar 6 |

## Supported Platforms

| Platform   | OAuth Status | Publishing Status |
|------------|-------------|-------------------|
| LinkedIn   | ✅ Live     | ✅ Live |
| Facebook   | ✅ Configured | 🔄 App Review Submitted |
| Instagram  | ✅ Configured | ❌ Requires Business Verification |
| X (Twitter)| ✅ Configured | ✅ Free Tier (50 tweets/day) |
| TikTok     | ✅ Configured | ✅ Available |
| YouTube    | ✅ Configured | ✅ Available |

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase project
- Google AI Studio API key (or OpenRouter API key)

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Providers
OPENROUTER_API_KEY=your_openrouter_key
GOOGLE_API_KEY=your_google_ai_key

# OAuth (at least one platform)
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

## Architecture

```
├── app/                    # Next.js App Router (pages + API routes)
│   ├── api/                # REST API endpoints
│   │   ├── auth/           # OAuth initiation & callbacks
│   │   ├── generate/       # AI content generation
│   │   ├── publish/        # Platform-specific publishing
│   │   └── automation/     # Worker & rules
│   └── dashboard/          # Admin dashboard pages
├── components/             # Reusable UI components
├── lib/                    # Core libraries
│   ├── ai-engine.ts        # AI generation client
│   ├── ai-router.ts        # Per-task model routing
│   ├── oauth.ts            # OAuth configuration per platform
│   ├── image-provider.ts   # Image generation registry
│   ├── video-provider.ts   # Video generation registry
│   └── providers/          # Platform & AI provider implementations
├── services/               # Business logic & data access
│   ├── publish-manager.ts  # Orchestrates multi-platform publishing
│   ├── platform-dispatcher.ts  # Routes to correct platform API
│   ├── retry-manager.ts    # Backoff retry logic
│   └── queue.ts            # Queue item CRUD
├── types/                  # TypeScript type definitions
└── supabase/migrations/    # Database schema migrations
```

### Publishing Flow

1. User creates a post → `queue_items` table (status: `draft`)
2. Optional approval workflow (`pending_approval` → `approved`/`rejected`)
3. Automation worker picks up approved & due items
4. Per-platform state tracked in `platforms` JSONB column
5. Parallel publishing via `Promise.allSettled` across platforms
6. Results logged in `publish_logs` table with duration, response, error
7. Retry policy: 30s → 2m → 10m backoff (OAuth errors never retried)

## Deployment

The app is deployed on Vercel at [app.namunafilms.com](https://app.namunafilms.com).

```bash
vercel deploy --prod
```

## License

MIT
