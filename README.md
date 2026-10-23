# CircleUp Connect

CircleUp Connect is a community-oriented application for discovering people and communities around shared interests, publishing posts, and chatting with a community AI assistant.

## Architecture

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS 3, Lucide React.
- **API:** Node.js and Express in `server/`.
- **Persistence:** PostgreSQL via `pg`; schema initialization is handled by the existing API.
- **Live messaging:** Socket.IO.
- **AI assistant:** server-side Gemini/OpenAI provider integration. Keep provider keys on the API server.
- **Additional backend:** `backend-java/` is retained independently; the current web UI uses the Express API endpoints documented in `server/README.md`.

The existing UI, styles, and backend logic are retained. Tailwind is available for incremental component styling rather than forcing a risky wholesale CSS rewrite.

## Prerequisites

- Node.js 20 or newer and npm
- PostgreSQL for account and social features
- A long, random JWT secret
- An optional Gemini or OpenAI API key for AI responses

## Run locally

1. Install dependencies from the repository root: `npm install`.
2. Create an untracked `.env` based on `.env.example`. Set `DATABASE_URL`, `JWT_SECRET`, and optionally `GEMINI_API_KEY` or `OPENAI_API_KEY`. Never commit credentials.
3. Start the API in one terminal: `npm run server`. It listens on port `10000` by default and requires a reachable database.
4. Start the frontend in another terminal: `npm run dev`. Open the local URL printed by Vite (normally `http://localhost:5173`). Vite proxies `/api` and Socket.IO traffic to `http://localhost:10000`.
5. Override the local API proxy target with `API_PROXY_TARGET`. For a separately hosted API, set `VITE_API_URL` to its origin and set server-side `CLIENT_ORIGIN` to the frontend origin. `VITE_*` variables are public at build time; never put secrets in them.

## Quality checks

```bash
npm test
npm run build
npm run test:e2e
```

Playwright may require browser installation. API-dependent workflows require PostgreSQL and a JWT secret. Use `GET /api/health` to inspect API/database/AI configuration.

## API integration status

The AI assistant uses the existing `POST /api/ai/chat` endpoint. The social feed currently has demo/local-storage interactions; migrate those screens to authenticated posts, likes, comments, and community endpoints in a separate tested step before considering all social workflows production-backed.

## Security

- Never commit `.env`, database credentials, JWT secrets, or AI provider keys.
- Enforce authorization in the API; frontend visibility is not an access-control boundary.
- Configure `CLIENT_ORIGIN` to explicit production origins.
- Run tests and review dependency updates before deployment.

## Contributing

Open issues with reproducible steps and submit focused changes with validation notes.

## License

No license file is currently declared. Add a `LICENSE` file to define reuse terms.
