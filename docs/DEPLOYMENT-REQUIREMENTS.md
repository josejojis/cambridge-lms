# Deployment requirements

## To confirm with Truehost before Phase 8

| # | Requirement | Why |
|---|---|---|
| 1 | The product is a **VPS with root/sudo SSH access**, not cPanel shared hosting | Needs PostgreSQL, Redis, Supervisor, Nginx config |
| 2 | OS and version (Ubuntu 24.04 LTS preferred) | Package availability for PHP 8.4 and PostgreSQL 17 |
| 3 | Resources: **at least 2 vCPU, 4 GB RAM, 50 GB SSD** recommended (2 GB is the bare minimum) | PHP-FPM + PostgreSQL + Redis + queue workers on one box |
| 4 | Permission to install PostgreSQL 17, Redis 7, PHP 8.4-FPM with extensions, Nginx, Supervisor, Certbot | Core stack |
| 5 | Ports 80/443 open; firewall managed by us (ufw) or by Truehost? | HTTPS and Let's Encrypt HTTP-01 challenge |
| 6 | Outbound HTTPS allowed to `api.safaricom.co.ke`, `sandbox.safaricom.co.ke`, the card gateway, and the mail/SMS providers | Payment verification and notifications |
| 7 | Static public IPv4 address | Some gateways allowlist merchant IPs; DNS A record |
| 8 | DNS for `elite-revision.com`: who manages it (Truehost or another registrar)? | A/AAAA, `www`, and SPF/DKIM/DMARC records for email |
| 9 | Snapshot or backup service, its frequency and retention; is off-site storage available? | Disaster recovery (we will also run our own `pg_dump` + file backups off-site) |
| 10 | Is outbound SMTP port 587 allowed, or must mail go through an HTTP API? | Email delivery |
| 11 | Data centre location (Kenya or abroad) | Kenya Data Protection Act cross-border transfer considerations for children's data |
| 12 | Can we run cron every minute and long-running processes (Supervisor)? | Laravel scheduler and queue workers |

## External credentials needed eventually

All credentials go into `.env` on the server only, never into Git. Sandbox credentials are used throughout development.

| Service | Credentials | Where obtained |
|---|---|---|
| M-Pesa Daraja (STK Push / Lipa Na M-Pesa Online) | Consumer key, consumer secret, business shortcode (Paybill or Till), Lipa Na M-Pesa passkey, callback URL | developer.safaricom.co.ke (sandbox is instant; production requires Go-Live approval) |
| M-Pesa (optional: reversals, transaction status, B2C refunds) | Initiator name, security credential (encrypted with Safaricom's cert) | Safaricom Go-Live |
| Card gateway (Paystack / Pesapal / Flutterwave / DPO) | Public key, secret key, webhook signing secret, IPN/callback URL | Gateway merchant dashboard |
| Transactional email | SMTP host/user/password or API key; verified sending domain | e.g. Brevo, Mailgun, Amazon SES |
| SMS | API key, username, sender ID (alphanumeric sender IDs need registration) | e.g. Africa's Talking |
| Off-site backups | S3-compatible bucket, access key, secret | e.g. Backblaze B2, Wasabi, AWS S3 |
| Error monitoring (optional) | DSN | e.g. Sentry |
| Let's Encrypt | None (email for expiry notices only) | Certbot on the server |
