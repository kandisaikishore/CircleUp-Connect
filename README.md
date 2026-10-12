# CircleUp Connect

**A social networking UI starter for discovering people and communities around shared interests.**

CircleUp Connect explores feed, profiles, interest matching, and community interactions through a responsive React interface.

## Features in the current demo

- Feed with sample posts, likes, comments, bookmarks, and copyable permalinks
- Create posts and persist demo state in browser storage
- Discover people using shared-interest tags and match scores
- Join and leave interest-based communities
- Messaging interface with local demo conversation history
- Notifications, saved posts, profiles, events, and privacy-settings screens
- AI community-finder UI with a transparent demo interaction (not connected to an LLM)

## Tech stack

- React and TypeScript
- Vite
- Lucide icons
- Custom responsive CSS
- Browser `localStorage`

## Quick start

```bash
git clone https://github.com/saikishore2410/CircleUp-Connect.git
cd CircleUp-Connect
npm install
npm run dev
```

## Build and test

```bash
npm test
npm run build
```

See `package.json` for the exact scripts configured in this branch.

## Architecture and limitations

Most interactions are front-end demonstrations backed by local browser state. A production social product would need secure authentication, server-side persistence, authorization, moderation/reporting, spam prevention, privacy controls, rate limiting, and tested messaging delivery. The AI finder UI is not an actual LLM integration in the current demo.

## Contributing

Propose focused changes with clear acceptance criteria and tests.

## License

No license is specified. Add a `LICENSE` file before granting reuse rights.