# CircleUp Connect

A React + TypeScript social networking starter for discovering like-minded people and building communities around shared interests.

## Stack
- React + TypeScript
- Vite
- Lucide React icons
- Responsive custom CSS (no UI framework dependency)
- Browser `localStorage` for demo posts, follows, joined communities, comments, and conversation history

## Features in this demo
- Responsive feed with sample posts, likes, comments, bookmarks, and copyable post permalinks
- Create posts and persist them in local storage
- Discover people with shared-interest tags and match scores
- Follow/connect UI and interest-based communities with join/leave state
- Messaging interface with local demo conversation
- Notifications, saved posts, profile, events, and privacy settings screens
- AI community finder UI with a transparent demo interaction (not connected to an LLM)
- Desktop sidebar, mobile drawer, and mobile bottom navigation

## Design handoff

See [`DESIGN_SPEC.md`](./DESIGN_SPEC.md) for the design tokens, screen inventory, reusable components, responsive behavior, and prototype interactions intended for Figma handoff. No Figma file has been created or synced yet because the Figma integration is not connected.

## Run locally
Requires Node.js 20+.

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Important implementation notes
This is a front-end demo. Authentication, multi-user real-time messaging, remote image upload, durable server storage, moderation workflows, and LLM calls are not configured. `localStorage` data is local to the current browser and is not shared across users/devices. Before production use, add a backend such as Supabase, implement row-level security, validate all inputs server-side, and connect an AI provider through a server-side function without exposing API keys in the browser.
