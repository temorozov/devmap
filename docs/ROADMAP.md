# Roadmap

> **June 2026 pivot:** DevMap moved away from "GitHub-verified skills" toward "show your stack beautifully in one link." The GitHub scan is now an editable draft, not a gate. Role readiness, skill-gap tracking, and the verified-rate stats were removed; Explore and Compare were merged.

## Done

**Show your stack**
- GitHub scan drafts an editable stack — detect 50+ techs, then add/remove/level by hand
- "Refresh from GitHub" — manual re-scan that preserves manual edits (replaced automatic webhook sync)
- "Used in N repos" shown as a quiet badge, not a requirement

**Beautiful profile**
- Public profile at `/u/handle` — user card + interactive skill map + grouped stack list
- Stripped the old profile noise: no role readiness, no verified-rate/view stats banners
- OG meta tags — profile page sets og:title/og:image/twitter:card on load; `/api/trees/og/:handle` for bot crawlers

**Share**
- README badge — `GET /api/trees/badge/:handle` returns an SVG card of the stack; dashboard "README badge" modal with one-click markdown copy
- One Share button — copy profile link + copy README badge

**Explore + Compare**
- `/explore` scans *any* public GitHub user on the fly (not just members)
- Compare is a mode of Explore — when logged in, diff their stack against yours (mine / common / theirs)
- `/compare/**` routes redirect to `/explore`

---

## Near-term

**Profile polish**
- Let users customize their handle (currently auto-set from GitHub username)
- "Last refreshed from GitHub" timestamp on the public profile
- More layout/theming options for the public stack

**Editor**
- Bulk add/remove skills
- Reorder categories, pin favorite skills
- Smarter category detection for ambiguous techs

**Explore improvements**
- Cache + pagination for live scans (rate-limit safety)
- Filter by skill; "also uses" suggestions

---

## Later

**Stack depth**
- Richer per-skill detail (links to the repos a tech appears in)
- Import from sources beyond GitHub

**Discovery / SEO**
- Sitemap of public profiles for search indexing
- Shareable comparison links

**Monetization hooks**
- Pro badge or custom domain for the profile URL
- Recruiter view — browse devs by stack
