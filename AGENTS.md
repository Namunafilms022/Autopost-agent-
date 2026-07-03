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
