# CircleUp Connect — Java backend

Spring Boot 3 / Java 21 REST API. It preserves the existing `/api` route shapes for auth, feed posts, likes, comments, communities, direct messages, health, and AI chat.

## Deploy with Render
Create a Docker web service for this repository:
- Dockerfile path: `backend-java/Dockerfile`
- Docker context: repository root (`.`)
- Branch: `main`
- Health check path: `/api/health`

Set environment variables in the Render dashboard:
- `DATABASE_URL`: PostgreSQL connection string (required for durable production data)
- `JWT_SECRET`: long, random secret (required; change the development fallback)
- `CLIENT_ORIGIN`: `https://circleup-connect.onrender.com`
- `GEMINI_API_KEY` (optional) and `GEMINI_MODEL=gemini-flash-latest`, or `OPENAI_API_KEY`

Without `DATABASE_URL`, the service starts on an in-memory H2 database so health/development endpoints can be checked, but data is ephemeral and health is degraded. Do not use H2 for production. Never commit API keys or secrets.

## Local
Requires JDK 21 and Maven 3.9+.
```sh
cd backend-java
mvn spring-boot:run
```
The service uses port 10000 by default.
