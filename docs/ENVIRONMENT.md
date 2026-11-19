# Local environment inspection

Inspected: 2026-11-19, in `C:\Users\ADMIN\Desktop\LMS`.

## Finding: this machine is Windows, not Kali Linux

The brief assumes Kali Linux. The machine actually running this work is:

| Item | Found |
|---|---|
| OS | Microsoft Windows 10 Pro, version 10.0.18363 (release 1909). Out of Microsoft support since May 2021. |
| Shell | Git Bash (MSYS2) and Windows PowerShell 5.1 |
| RAM / disk | ~8 GB RAM, 173 GB free on C: |
| Hardware virtualization | **Disabled in firmware**, so WSL2, Docker Desktop and Hyper-V cannot run until it is enabled in BIOS/UEFI |
| Package manager | `winget` present; Chocolatey and Scoop absent |
| Project directory | Empty before this work started (no user files at risk) |

## Toolchain

| Tool | Status | Required for |
|---|---|---|
| Git | 2.56.0 ✅ (no global `user.name` / `user.email` configured) | Version control |
| Node.js | 26.13.0 ✅ | Frontend build |
| npm | 11.20.0 ✅ | Frontend dependencies |
| PHP | ❌ not installed (also not found under XAMPP, Laragon or WAMP) | Laravel backend |
| Composer | ❌ not installed | Laravel dependencies |
| PostgreSQL | ❌ not installed | Database |
| Redis | ❌ not installed (no official Windows build exists) | Cache and queues |
| Nginx | ❌ not installed (not needed locally; `php artisan serve` and the Vite dev server are enough) | Production only |
| Docker / WSL | ❌ not available (virtualization disabled) | Optional |

**Consequence:** the frontend can be scaffolded now. The Laravel backend and every backend test need PHP 8.3+, Composer and PostgreSQL installed first.

## Recommended versions

Development and production should use the same major versions. Exact patch versions are pinned in lock files (`composer.lock`, `package-lock.json`) at scaffold time.

| Component | Recommendation | Notes |
|---|---|---|
| PHP | **8.4** | Supported by current Laravel releases. Extensions: `pdo_pgsql`, `pgsql`, `mbstring`, `openssl`, `intl`, `fileinfo`, `curl`, `zip`, `gd` or `imagick`, `bcmath`, `redis` (prod) |
| Laravel | **Latest stable major at install time** (13.x if available, otherwise 12.x) | Sanctum, Pest or PHPUnit, Form Requests, Policies, Queues |
| PostgreSQL | **17** | Choose the version Truehost's OS repo (or PGDG) supports, and match it locally |
| Redis | **7.x** (or Valkey 8) in production | Locally on Windows, use Laravel's `database` cache and queue drivers. The code stays driver-agnostic. |
| Node.js | **24 LTS or 26 LTS** (26.13 is installed) | Used only to build the frontend. Production serves static files and does not need Node. |
| React | 19.x | |
| TypeScript | 5.x | |
| Vite | Latest stable | |
| Tailwind CSS | 4.x | |
| Nginx | 1.24+ (production) | |

## Options to make the backend runnable on this machine

1. **Native Windows install via winget (recommended, fastest):** PHP 8.4, Composer and PostgreSQL 17. No reboot or BIOS change. Redis is replaced locally by the database driver.
2. **Enable virtualization in BIOS, then use WSL2 (Ubuntu or Kali):** closest to production Linux. It needs a BIOS change, Windows updates (WSL2 on 1909 requires KB4566116) and reboots.
3. **Develop on a separate Kali Linux machine,** as the brief describes. I can't reach that machine from this session.
