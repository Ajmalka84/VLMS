# VLMS Production Deployment Guide 🚀
### Ultra-Low-Cost VPS Architecture (~₹350 – ₹450 / Month)

This is a complete, beginner-friendly, step-by-step guide to deploying the Vehicle Load Management System (VLMS) to a live production server.

---

## 📋 Infrastructure & Cost Overview

| Component | Recommended Provider | Specs | Estimated Cost |
| :--- | :--- | :--- | :--- |
| **Domain Name** | Namecheap / GoDaddy / Cloudflare | `yourquarryname.in` or `vlms.in` | ~₹499 – ₹899 / **year** |
| **Virtual Server (VPS)** | **Hetzner Cloud (CX22)** or Hostinger / DigitalOcean | 2 vCPUs, 4 GB RAM, 40 GB NVMe SSD, Ubuntu 24.04 LTS | ~€3.79 / month ≈ **₹350 / month** |
| **DNS & SSL (HTTPS 🔒)** | **Cloudflare (Free Tier)** | Free SSL certificate, DDoS protection, CDN caching | **₹0 (100% Free)** |
| **Daily Backups** | Local 90-day retention engine + Cloudflare R2 | Automated 2:00 AM daily snapshots | **₹0 (100% Free)** |

**Total Estimated Monthly Cost**: **~₹350 / month** ($4.20 USD).

---

## 🛠️ Step-by-Step Deployment Walkthrough

---

### Step 1: Buy Your Domain Name & Connect to Cloudflare (10 mins)

1. Purchase your desired domain (e.g. `vlms.in` or `myquarryapp.com`) from [Namecheap](https://namecheap.com), [GoDaddy](https://godaddy.com), or [Hostinger](https://hostinger.in).
2. Create a free account on [Cloudflare](https://dash.cloudflare.com/sign-up).
3. Click **Add a Domain** and enter your domain name. Select the **Free Plan**.
4. Cloudflare will give you **2 Nameservers** (e.g., `mona.ns.cloudflare.com` and `todd.ns.cloudflare.com`).
5. Go to your domain registrar (where you bought the domain), find **Nameservers / DNS Settings**, and replace the default nameservers with Cloudflare's two nameservers.
   *(Propagation usually takes 5 to 15 minutes).*

---

### Step 2: Rent Your VPS Server (5 mins)

1. Sign up on [Hetzner Cloud](https://www.hetzner.com/cloud) (or [Hostinger VPS](https://hostinger.in/vps-hosting) / [DigitalOcean](https://digitalocean.com)).
2. Click **Create Server**:
   * **Location**: Nuremberg / Falkenstein (or Singapore / Bangalore if available).
   * **Image (OS)**: **Ubuntu 24.04 LTS**.
   * **Type**: Standard (Arm or x86) — **CX22** (2 vCPU, 4 GB RAM, 40 GB SSD).
   * **SSH Key**: Add your SSH public key or choose password authentication.
3. Click **Create & Buy Now**.
4. Note your server's **Public IPv4 Address** (e.g., `123.45.67.89`).

---

### Step 3: Point Your Domain to the VPS in Cloudflare (2 mins)

1. In your Cloudflare Dashboard, go to **DNS** > **Records**.
2. Add the following two records:
   * **Record 1 (Root Domain)**:
     * **Type**: `A`
     * **Name**: `@` (or your domain name)
     * **IPv4 Address**: `123.45.67.89` (your VPS IP)
     * **Proxy Status**: `Proxied (Orange Cloud)` ☁️
   * **Record 2 (WWW Subdomain)**:
     * **Type**: `CNAME`
     * **Name**: `www`
     * **Target**: `@` (or your root domain)
     * **Proxy Status**: `Proxied (Orange Cloud)` ☁️
3. Go to **SSL/TLS** tab in Cloudflare:
   * Set encryption mode to **Full** (or **Flexible**).

---

### Step 4: Connect to the Server & Install Docker (5 mins)

1. Open the Terminal on your Mac and connect to your VPS:
   ```bash
   ssh root@123.45.67.89
   ```
   *(Replace `123.45.67.89` with your real VPS IP).*

2. Update system packages and install Docker with 1 command:
   ```bash
   apt update && apt upgrade -y
   curl -fsSL https://get.docker.com | sh
   ```

3. Verify Docker installation:
   ```bash
   docker --version
   docker compose version
   ```

---

### Step 5: Clone VLMS Code & Configure Production Secrets (5 mins)

1. Clone the repository into `/opt/vlms`:
   ```bash
   git clone https://github.com/Ajmalka84/VLMS.git /opt/vlms
   cd /opt/vlms
   ```

2. Create your private production environment file:
   ```bash
   cp .env.production.example .env.production
   ```

3. Open `.env.production` in the text editor:
   ```bash
   nano .env.production
   ```

4. Fill in your real production values:
   * `POSTGRES_PASSWORD`: Generate a strong password (e.g., run `openssl rand -hex 16` in another window).
   * `DATABASE_URL`: Replace the password with your chosen `POSTGRES_PASSWORD`.
   * `FRONTEND_ORIGIN`: `https://yourdomain.com` (e.g., `https://vlms.in`).
   * `VITE_BACKEND_URL`: `https://yourdomain.com`.
   * `JWT_SECRET`: Generate a 64-char key (e.g., run `openssl rand -hex 32`).
   * `SUPER_ADMIN_MOBILE`: `ajmalka84@gmail.com`.
   * `SUPER_ADMIN_PASSWORD`: Your secret production Super Admin password.
   *(Press `Ctrl + O` then `Enter` to save, and `Ctrl + X` to exit nano).*

---

### Step 6: Launch Production Containers (3 mins)

1. Build and start all production services:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

2. Run initial database migration to initialize all tables:
   ```bash
   docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
   ```

3. Check container health:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```
   *You should see `postgres`, `backend`, `frontend`, and `nginx` all showing `Up` (healthy).*

4. Open `https://yourdomain.com` in your mobile browser or laptop!
   * You will see the VLMS Sign-In screen with the green HTTPS padlock 🔒.

---

### Step 7: Set Up Automated 2:00 AM Daily Backups (90-Day Retention) (2 mins)

1. Make the backup scripts executable:
   ```bash
   chmod +x /opt/vlms/scripts/backup.sh /opt/vlms/scripts/restore.sh
   ```

2. Test the backup script manually once:
   ```bash
   bash /opt/vlms/scripts/backup.sh
   ```
   *Output will show `✅ Backup completed successfully!`.*

3. Add the backup to Linux Cron so it runs automatically every night at 2:00 AM:
   ```bash
   crontab -e
   ```
   *(If prompted, press `1` for nano).*
   
   Paste the following line at the bottom:
   ```text
   0 2 * * * cd /opt/vlms && bash scripts/backup.sh >> /var/log/vlms_backup.log 2>&1
   ```
   *(Press `Ctrl + O`, `Enter`, and `Ctrl + X` to save).*

---

## 🔄 Routine Operations & Cheat Sheet

### How to Deploy Future Code Updates from GitHub:
When you push new features or fixes from your Mac to GitHub:
```bash
ssh root@123.45.67.89
cd /opt/vlms
git pull origin dev
docker compose -f docker-compose.prod.yml up -d --build
```
*(Zero downtime — Docker rebuilds the images and swaps them seamlessly in 5 seconds).*

---

### How to View Live Server Logs:
```bash
# View all logs
docker compose -f docker-compose.prod.yml logs -f

# View only backend errors
docker compose -f docker-compose.prod.yml logs -f backend

# View only Nginx web requests
docker compose -f docker-compose.prod.yml logs -f nginx
```

---

### How to Restore from a Backup (Disaster Recovery):
If you ever need to restore database records from a previous day:
```bash
cd /opt/vlms

# List available backups
ls -lh backups/

# Restore a specific backup
bash scripts/restore.sh backups/vlms_vlms_prod_YYYY-MM-DD_HHMMSS.dump
```

---

### How to Check Server Resource Usage (CPU & RAM):
```bash
docker stats
```
*(You will see the entire stack comfortably using < 400 MB of RAM!).*

---

🎉 **Congratulations! Your SaaS platform is live, secured, automated, and ready for paying quarry customers!**
