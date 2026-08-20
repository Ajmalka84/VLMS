# Hurdle 12: Production Deployment — Plan

## Objectives
1. **Ultra-Low-Cost Infrastructure Blueprint**:
   - Deliver a high-performance production deployment blueprint optimized for a solo founder on an affordable single VPS (~₹350 – ₹450/month).
2. **Multi-Stage Production Docker Builds**:
   - `frontend/Dockerfile.prod`: Compiles Vite React application into static assets served via an Alpine Nginx image with gzip/brotli compression and asset caching.
   - `backend/Dockerfile.prod`: Compiles TypeScript NestJS into a lean, production-only Node 24 Alpine runtime.
   - `docker-compose.prod.yml`: Production orchestration with `restart: always`, private bridge networking, and persistent named volumes.
3. **Nginx Reverse Proxy & Gateway**:
   - `nginx/nginx.prod.conf`: Centralized reverse proxy handling ports 80/443, routing `/api/` to backend, `/` to frontend, security headers, and rate limits.
4. **Automated Zero-Cost Backup Engine (90-Day Retention)**:
   - `scripts/backup.sh`: Daily automated `pg_dump -Fc` cron script with 90-day retention rotation.
   - `scripts/restore.sh`: 1-command disaster recovery restore script.
5. **Comprehensive Server Guide**:
   - `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`: Step-by-step checklist for domain setup, Cloudflare DNS/SSL, VPS provisioning, and initial launch.

## Verification
- Verified production build pipelines (`npm run build`).
- Verified backup creation and 90-day retention policies with `scripts/backup.sh`.
- Verified automated test suite with 29/29 passing tests.
