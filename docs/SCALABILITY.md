# Scalability baseline

This checklist is a repository-specific starting point for production readiness. It does not claim that load testing or production scaling has already been completed.

## Current service topology

- Express API and Socket.IO share one Node.js process.
- PostgreSQL is accessed through a `pg.Pool`.
- AI provider calls are made synchronously from the request path.
- The application initializes tables at process startup.

## Scalability priorities

### 1. Database
- Keep all application queries parameterized.
- Review query plans with `EXPLAIN (ANALYZE, BUFFERS)` against representative data before adding indexes.
- Size the PostgreSQL pool against the database connection budget and the number of application replicas.
- Move schema changes into versioned migrations before adding more replicas; avoid every replica independently running DDL.
- Add cursor pagination for high-volume feeds and message history.

### 2. API and process
- Keep API instances stateless; use external stores for distributed sessions, rate limits, jobs, and other shared state when introduced.
- Set explicit request, database, and upstream provider timeouts.
- Handle SIGTERM/SIGINT by stopping new connections, closing Socket.IO/HTTP, and ending the database pool.
- Separate liveness from readiness checks. Readiness should fail when required dependencies are unavailable; liveness should detect a stuck process without causing avoidable restart loops.

### 3. Realtime and AI workloads
- Socket.IO rooms are process-local unless a compatible distributed adapter is configured. Multi-replica deployments require a shared adapter and a compatible load-balancing/session-affinity strategy.
- Move costly AI operations to a bounded queue when usage requires it; apply per-user quotas, concurrency limits, retries with jitter, and provider spend monitoring.
- Do not queue work without idempotency keys and explicit retry behavior.

### 4. Validation before scaling
- Test at expected normal and peak concurrency with realistic database volume.
- Record p50/p95/p99 latency, error rate, throughput, event-loop delay, CPU/memory, DB pool wait time, active connections, and upstream timeout/rate-limit counts.
- Scale out only after identifying the bottleneck; tune resource limits and pool sizes in concert.
- Verify rate limiting is shared across replicas if global quotas are required.
- Load-test authorization, pagination, realtime delivery, and degraded dependency behavior.

## Deployment acceptance checklist

- [ ] Versioned database migrations run as a controlled deployment step.
- [ ] Readiness and liveness checks have distinct semantics.
- [ ] Graceful shutdown is validated under traffic.
- [ ] Production secrets are managed through the deployment platform.
- [ ] Socket.IO multi-instance delivery is verified before enabling multiple replicas.
- [ ] Load-test results and capacity assumptions are recorded.
- [ ] Backup and restore procedures are tested.

## Scope and caveat

This document is a plan, not a claim that the application is already horizontally scalable. Validate every proposed change in CI/staging and against actual hosting configuration before increasing replica counts.
