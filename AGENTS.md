<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## Session: 2026-07-01 — Social Accounts OAuth & Instagram Connection

### What was done
- Created `lib/oauth.ts` — OAuth configs for Instagram, Facebook, LinkedIn, X, TikTok with `buildOAuthUrl()` and `exchangeCode()` helpers
- Created `app/api/auth/[platform]/route.ts` — initiates OAuth redirect to the platform
- Created `app/api/auth/[platform]/callback/route.ts` — handles OAuth callback: reads user session cookie, exchanges auth code for token, upserts to Supabase
- Updated `app/dashboard/social/page.tsx` — Connect button triggers OAuth, Manual ghost button as fallback, reads `?connected=true`/`?error=` query params for toast feedback
- Added TikTok to all platform enums, types, and DB CHECK constraint (migration 017)
- Updated `.env.local` with Instagram credentials and OAuth placeholder vars
- Fixed `connectSocialAccount()` in `services/social.ts` to include `user_id` in upsert (was missing, causing RLS insert failures)
- Instagram OAuth config updated from deprecated Basic Display API to Instagram API with Instagram Login (using `api.instagram.com/oauth/authorize` and `instagram_business_*` scopes)

### What user did
- Created Meta Business app for Instagram
- Got App ID and App Secret
- Set `https://localhost:3000/api/auth/instagram/callback` as redirect URI (Meta rejects `http://`)
- Generated a token via Graph API Explorer
- Connected Instagram via Manual mode

### Pending
- Instagram posting requires: Business/Creator account linked to a Facebook Page + App Review for `instagram_content_publish`
- Other platforms (FB, LinkedIn, X, TikTok) need OAuth app setup or manual tokens
- Instagram OAuth flow won't work on localhost due to Meta's HTTPS requirement for redirect URIs (server runs HTTP)

---

## Sessions: 2026-07-06 to 2026-07-09 — Production Polish & Platform Publishing

### What was done (code)
- **Production polish** (10 items): parallel publishing, per-platform status, retry only failed platforms, real-time progress, human-friendly errors (`toFriendlyError()` with `isOAuthError()`/`isTemporaryError()`), expandable logs (started_at, finished_at, duration, retry_count, platform_post_id, platform URL, raw response), queue analytics dashboard cards (Published Today, Queued, Publishing, Failed, Partial, Avg Publish Time, Success Rate), Worker Health card, Activity Feed, queue filters (status tabs + search), auto-retry policy (30s → 2m → 10m backoff, OAuth NEVER retried), `processingItems` Set dedup, capability validation (`validatePublishMedia()` with aspect ratio/video length checks)
- **Facebook fix**: dispatcher detects video vs image URLs → uses correct endpoint (`/videos` / `/photos` / `/feed`); API version downgraded to v19.0 (v22 regression)
- **Capability interface**: added `maxDuration`/`minDuration` fields with per-platform values
- **TypeScript fixes**: `validateMedia()` call signature in publish-manager, `PlatformState` typing in retry-manager
- **LinkedIn**: full OAuth + publishing via Posts API (`POST /rest/posts`, `POST /rest/images?action=initializeUpload`) — Live-approved and publishing works
- **Queue page**: Status filter tabs (All/Queued/Publishing/Published/Partial/Failed/Draft) + search input + expandable publish logs in view dialog
- **Vercel**: deployed at `https://app.namunafilms.com`

### Platform publishing status
- **LinkedIn**: ✅ Live — app published, `w_member_social` approved, users can OAuth and post
- **Facebook/Meta**: 🔄 Submitted for App Review (`pages_manage_posts` Advanced Access). DNS TXT record added for domain verification: `facebook-domain-verification=2hg1v46xgxi2hpnbfi7ad0tdt3qhz5` on `namunafilms.com`
- **Instagram**: ❌ Blocked on Business Verification for `instagram_content_publish`. Cross-posting from FB Page as workaround possible
- **X (Twitter)**: ✅ Credentials in `.env.local`, OAuth routes exist, Free tier allows posting (50 tweets/day, 1,500/month)
- **TikTok**: Credentials in `.env.local`, OAuth routes exist
- **YouTube**: Credentials in `.env.local`, OAuth routes exist

### .env.local credentials set
- `INSTAGRAM_CLIENT_ID` + `INSTAGRAM_CLIENT_SECRET`
- `LINKEDIN_CLIENT_ID` + `LINKEDIN_CLIENT_SECRET` ✅ Live
- `X_CLIENT_ID` + `X_CLIENT_SECRET`
- `TIKTOK_CLIENT_ID` + `TIKTOK_CLIENT_SECRET`
- `YOUTUBE_CLIENT_ID` + `YOUTUBE_CLIENT_SECRET`

### Pending
- Meta Business Verification for Instagram publishing
- X/TikTok/YouTube can be connected and tested anytime
- AutoPost Agent project located at `/Users/macmini/Desktop/autopost agent`
