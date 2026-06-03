# Roadmap

## Done

**Retention loop**
- GitHub webhook auto-sync — map updates on every push, no user action needed
- Profile view counter — 24h IP-dedup, "N views this week" on dashboard and profile
- Weekly email digest — Monday 9am UTC cron, view count + trend, skips without RESEND_API_KEY
- Skills-updated email — fires on re-sync when new skills detected vs previous scan

**Acquisition loop**
- README badge — `GET /api/trees/badge/:handle` returns shields.io-style SVG; dashboard "Add to README" modal with one-click markdown copy
- OG meta tags — profile page sets og:title/og:image/twitter:card on load; `/api/trees/og/:handle` endpoint for bot crawlers
- Explore page — `/explore` discovery feed of recently active devs with top skills

**Profile depth**
- Skill gap tracker — user declares target role (Senior Backend, Full-Stack, DevOps, etc.), stored in DB, shown on public profile as progress bar + have/missing chips
- Public profile view stats — "Views this week" stat on profile
- Landing page auth awareness — logged-in users see "Dashboard" instead of "Sign in"

---

## Near-term

**Webhook reliability**
- Show webhook registration status on dashboard (which repos are hooked, last sync time)
- Handle GitHub webhook delivery failures / retries gracefully
- Add a "reconnect GitHub" flow for users who need to re-auth for `admin:repo_hook` scope

**Profile polish**
- Let users customize their handle (currently auto-set from GitHub username)
- Add a "last synced" timestamp on the public profile
- Show repo count on profile (how many repos were scanned)

**Explore improvements**
- Pagination or infinite scroll (currently capped at 24)
- Filter by skill or role
- "Trending" sort (most views this week)

**Email**
- Make digest opt-out possible (unsubscribe link)
- Weekly digest: include target role progress if set

---

## Later

**Skill gap**
- Add more role profiles (Data Engineer, Security Engineer, SRE, etc.)
- Let users add custom skills to their map manually (not just GitHub-detected)
- Show "most common missing skill" across users targeting the same role

**Discovery / SEO**
- Sitemap of public profiles for search engine indexing
- Role-based landing pages (`/devs/senior-backend`) for organic search

**Social proof**
- "Also uses" connections between devs with overlapping skills
- Skills leaderboard (most verified devs per technology)

**Monetization hooks**
- Pro badge or custom domain for profile URL
- Recruiter view — bulk browse devs by skill set
