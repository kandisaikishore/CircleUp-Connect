# CircleUp Connect API

The API is a Node.js/Express service that provides PostgreSQL-backed accounts, posts, likes, comments, communities, direct messages, Socket.IO message notifications, and an OpenAI-compatible chat endpoint.

## Environment variables

- `DATABASE_URL`: PostgreSQL connection string. Required for account/social endpoints.
- `JWT_SECRET`: long random secret used to sign sessions. Required for auth and Socket.IO.
- `OPENAI_API_KEY`: secret API key for OpenAI. Optional until AI is enabled; never expose it in frontend code.
- `OPENAI_MODEL`: optional model name, defaults to `gpt-4o-mini`.
- `CLIENT_ORIGIN`: optional comma-separated allowed frontend origins. Set this to the deployed frontend URL.
- `PORT`: supplied automatically by Render.

## Local development

From the repository root, install dependencies and run `npm run server`. Configure environment variables in your local environment or an untracked `.env` file. Never commit credentials.

## Endpoints

- `GET /api/health`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/posts`, authenticated `POST /api/posts`
- Authenticated `POST /api/posts/:id/like`, `GET/POST /api/posts/:id/comments`
- `GET /api/communities`, authenticated `POST /api/communities/:id/join`
- Authenticated `GET/POST /api/messages/:userId`
- `POST /api/ai/chat`

The current React frontend still contains demo-only screens. Configure the API URL and connect UI flows to these endpoints before treating all social features as production-ready.
