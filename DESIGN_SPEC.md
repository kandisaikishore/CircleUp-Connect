# CircleUp Connect — UI handoff specification

This document describes the current React UI so it can be recreated as editable Figma frames when the Figma integration is connected. It is a design handoff, not a claim that a Figma file has already been created.

## Product direction
A warm, low-pressure social network for people who want to meet others through shared interests, learning goals, and community participation. The interface uses a calm lavender accent, generous white cards, muted metadata, rounded corners, and compact typography.

## Design tokens

| Token | Value | Usage |
|---|---|---|
| Ink | `#25283A` | Primary text |
| Muted | `#898DA2` | Secondary text and metadata |
| Purple | `#6256D9` | Primary actions, active navigation, links |
| Purple dark | `#5044C2` | Hover state for primary actions |
| Lavender wash | `#F0EFFF` | Selected states and soft backgrounds |
| Page background | `#F7F8FC` | Application canvas |
| Card | `#FFFFFF` | Cards, panels, navigation |
| Border | `#ECECF3` | Dividers and card borders |
| Mint | `#D9F3E7` | Positive/community accent |
| Coral | `#FFE0D5` | Warm secondary accent |
| Sky | `#DCEEFF` | Informational accent |

Typography: DM Sans for interface text and Manrope for brand/headings. Use 8 px spacing increments where practical, 10–17 px card radii, and visible keyboard focus rings.

## Frames to create in Figma
1. **Home / Feed — Desktop (1440 × 1000):** fixed left sidebar, sticky top bar, page heading, welcome card, post composer shortcut, post feed, and right-rail recommendations.
2. **Discover — Desktop (1440 × 1000):** discover hero, searchable people cards with shared-interest chips and match labels, plus AI Finder panel.
3. **Communities — Desktop (1440 × 1000):** community cards with category, member count, description, and join state.
4. **Messages — Desktop (1440 × 1000):** inbox list and active conversation panel.
5. **Create Post — Modal (560 px wide):** author identity, 500-character text field, action row, and publish button.
6. **Mobile Feed (390 × 844):** collapsed top bar, single-column feed, mobile drawer entry point, fixed bottom navigation.
7. **Profile and Settings:** cover/profile header, interest chips, profile tabs, privacy toggles, and account actions.

## Reusable components
- Brand mark and wordmark
- Sidebar navigation item (default, hover, selected, notification count)
- Avatar (small, medium, large; coral, lavender, mint, sky, indigo variants)
- Primary and secondary buttons (default, hover, disabled)
- Post card (default, liked, saved, comments expanded)
- Comment row and comment input
- Person card (default, following/connected)
- Community card (not joined, joined)
- Notification row (read/unread)
- Chat bubble (incoming/outgoing)
- Search field
- Modal and toast
- Settings toggle

## Responsive behavior
- Above 1200 px: sidebar + feed + right rail.
- 901–1200 px: narrower sidebar and right rail.
- 701–900 px: off-canvas sidebar and mobile bottom navigation; dashboard remains two columns when space allows.
- At 700 px and below: one-column feed, compact controls, single-column communities/events, bottom navigation.

## Prototype interactions
Like/unlike posts, save/unsave posts, add comments, create posts, search people, follow/connect, join/leave communities, switch navigation pages, send demo chat messages, open/close the post composer, and copy a post permalink.

## Current limitations
The Figma file is not yet connected or synced. Current screen content is demo data; authentication, server persistence, real-time messaging, image upload, moderation, and a live LLM endpoint are not configured. Match percentages and suggested events are illustrative, not calculated from a real account or live event source.
