# ClimbUp — Climbing Route Platform

🇪🇸 [Español](README.md) · 🇬🇧 English

[![CI](https://github.com/enlike21/ClimbUp/actions/workflows/ci.yml/badge.svg)](https://github.com/enlike21/ClimbUp/actions/workflows/ci.yml)
[![License: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Good first issues](https://img.shields.io/github/issues/enlike21/ClimbUp/good%20first%20issue?label=good%20first%20issues)](https://github.com/enlike21/ClimbUp/issues?q=is%3Aopen+label%3A%22good%20first%20issue%22)

**ClimbUp** is a web platform to discover, manage and track climbing routes in Spain. Explore routes on an **interactive map**, save them, log ascents, check personal stats, and chat with a climbing-specialized **AI assistant**.

🌐 **Production:** [climbup.es](https://climbup.es)

ClimbUp is **free software** ([AGPL-3.0-or-later](LICENSE)) and welcomes contributions: read
[CONTRIBUTING.md](CONTRIBUTING.md) to set the project up and open your first pull request.
Security issues are reported privately, per [SECURITY.md](SECURITY.md).

---

## Table of Contents

- [Stack](#stack)
- [Features](#features)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Quick start with Docker](#quick-start-with-docker)
- [Environment configuration](#environment-configuration)
- [Database](#database)
- [Users and Roles](#users-and-roles)
- [AI Assistant](#ai-assistant)
- [Al Filo Mini-game](#al-filo-mini-game)
- [SEO](#seo)
- [Security](#security)
- [Production deployment](#production-deployment)
- [E2E with Cypress](#e2e-with-cypress)
- [Application routes](#application-routes)
- [Project structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Stack

| Layer         | Technology                                                      |
|---------------|-----------------------------------------------------------------|
| Backend       | **Symfony 7.4**, PHP 8.4, Doctrine ORM                          |
| Frontend      | **Twig**, custom CSS, GSAP, Leaflet (OpenStreetMap)              |
| Database      | **MariaDB 10.6**                                                |
| AI            | **Groq API** (Llama 3.1 8B Instant)                             |
| Infra (dev)   | Docker Compose: php-fpm, Nginx, MariaDB, Mailpit, Adminer       |
| Infra (prod)  | **Plesk** (Ubuntu 24.04), GitHub Actions CI/CD                  |
| Testing       | **PHPUnit**, **PHPStan**, PHP CS Fixer, **Cypress** (E2E)       |

---

## Features

### Public area
- **Homepage** with live statistics (routes, climbers, locations)
- **Route listing** with combinable filters: type, difficulty, region, location, and sorting
- **Interactive map** (Leaflet + OpenStreetMap) with per-area markers and their routes
- **Route detail**: full info, difficulty, length, sector, rating and map location
- **Per-location page**: all routes in an area with their data

### User area (login required)
- Save routes as **"to do"**
- Mark routes as **completed** with a date
- **Personal statistics**: completed routes, distribution by region and grade, highest grade reached, latest ascents
- **Profile** management: name and password (changing it requires the current one)
- **Al Filo**: climbing mini-game with leaderboard, daily challenge and achievements

### Administration (ROLE_ADMIN)
- Full CRUD for **climbing routes** and **locations**
- **User** management with pagination
- Global system statistics dashboard

### AI Assistant
- Natural-language chat to **search routes** by type, grade, area or features
- Renders route cards with a direct link to the detail page
- Keeps conversation history in the session (max 10 pairs)
- Rate limiting and anti-spam protections built in

---

## Architecture

```
src/
├── Controller/
│   ├── Admin/          # AdminController (dashboard and users), AdminRouteController (route CRUD)
│   ├── Chatbot/        # ChatbotController
│   ├── Game/           # GameController (game page, runs, cosmetics)
│   ├── Location/       # LocationController, MapController
│   ├── Route/          # RouteController (paginated listing and detail)
│   ├── Security/       # LoginController, RegistrationController
│   ├── User/           # ProfileController, PublicProfileController, SavedRoutesController
│   ├── HomeController
│   └── SitemapController
├── Entity/
│   ├── ClimbingRoute   # name, type, difficulty, pitches, length, rating, sector
│   ├── Location        # name, latitude, longitude, region
│   ├── User
│   ├── UserRoute       # route saved by a user
│   ├── CompletedRoute  # logged ascent: date, ascent type, rating, notes
│   ├── GameScore       # each player's best height in Al Filo
│   ├── GameDailyScore  # best height per player and day in the daily challenge
│   └── GameProfile     # achievements, chosen cosmetic and games played
├── Enum/
│   ├── RouteType       # Sport | Trad | Boulder | Toprope | Aid | Alpine
│   └── AttemptType     # Onsight | Flash | Redpoint | Top-rope
├── Service/
│   ├── Ai/
│   │   ├── AiProviderInterface
│   │   ├── GroqProvider      # Groq API integration (Llama 3.1)
│   │   ├── ChatbotService    # conversation logic + search
│   │   └── PromptBuilder     # system prompt construction
│   ├── Game/
│   │   ├── ClimbSimulation   # PHP copy of the game simulation (public/js/game/sim.js)
│   │   ├── GameRunValidator  # replays every submitted run before saving it
│   │   ├── GameAchievements  # achievements and the cosmetics they unlock
│   │   └── Mulberry32        # seeded RNG, identical to the JS one
│   ├── GradeConversionService  # YDS → French scale conversion
│   ├── LocationNameParser      # "Sector > Area > Region > Spain" → name, region, sector
│   └── StatisticsService       # cached stats (Symfony Cache)
├── EventSubscriber/
│   └── SecurityHeadersSubscriber  # HTTP security headers
└── Command/
    ├── ImportRoutesCommand    # app:import-routes, imports routes from CSV
    └── FixLocationDataCommand # fixes location coordinates and names
```

The game lives in `public/js/game/` (buildless ES modules: `sim.js`, `render.js`, `audio.js`,
`main.js`); its PHP parity tests are in `tests/Service/Game/` and `tests/js/`.

### Internal API (JSON for the map)

| Method | Endpoint                          | Description                              |
|--------|-----------------------------------|------------------------------------------|
| GET    | `/api/locations`                  | Locations with their route counts         |
| GET    | `/api/routes`                     | All routes with their location            |
| POST   | `/api/chat`                       | Send a message to the AI assistant        |
| POST   | `/api/chat/clear`                 | Clear the chat history                    |
| POST   | `/api/juego/partida`              | Submit an Al Filo run (server replays and validates it) |
| POST   | `/api/juego/aspecto`              | Choose the climber's cosmetic             |

---

## Requirements

- **Recommended**: Docker + Docker Compose
- **Classic**: PHP 8.4, Composer, Symfony CLI
- Node 18+ if you run Cypress outside Docker
- A **Groq** API key for the AI assistant

---

## Quick start with Docker

```bash
cp .env.example .env
# The example values work for development; change APP_SECRET to a random one
# and add your Groq key if you want the AI assistant.

docker compose up -d --build
# On first run the web container installs dependencies on its own; follow it with:
# docker compose logs -f web   (until you see "Iniciando PHP-FPM")

docker compose exec web php bin/console doctrine:migrations:migrate --no-interaction

# Sample data (made-up routes and areas)
docker compose exec web php bin/console app:import-routes data/sample_routes.csv
```

**Available URLs**

| Service        | URL                        |
|----------------|----------------------------|
| Application    | http://localhost:8080       |
| Adminer (DB)   | http://localhost:8082       |
| Mailpit (SMTP) | http://localhost:8025       |

---

## Environment configuration

Create your `.env` from the template (never commit the real `.env`):

```bash
cp .env.example .env
```

Required variables (the ones in `.env.example` already work with the dev Docker setup):

```dotenv
APP_ENV=dev
APP_SECRET=a_random_value

# Local database created by docker-compose.yml (keep in sync with DATABASE_URL)
DB_ROOT_PASSWORD=root
DB_NAME=escalada_db
DB_USER=climbup_app
DB_PASSWORD=climbup
DATABASE_URL="mysql://climbup_app:climbup@database:3306/escalada_db?serverVersion=10.6&charset=utf8mb4"

MESSENGER_TRANSPORT_DSN=doctrine://default?auto_setup=0
MAILER_DSN=smtp://mailer:1025   # Mailpit in dev
LOCK_DSN=flock

# Groq API (AI assistant, optional)
GROQ_API_KEY=your_groq_api_key_here
```

For Cypress, export `CYPRESS_BASE_URL`, `CYPRESS_USER_EMAIL` and `CYPRESS_USER_PASSWORD`
(a user from your local database) before launching it.

---

## Database

### Schema

```bash
docker compose exec web php bin/console doctrine:migrations:migrate --no-interaction
```

### Sample data

`data/sample_routes.csv` contains 60 routes across 6 **made-up** areas, so you can develop
without depending on third-party data:

```bash
docker compose exec web php bin/console app:import-routes data/sample_routes.csv
# --clean removes all routes and locations first
```

The command accepts any CSV with the same column format (Mountain Project exports). **Do not
commit data from other websites**: their terms usually forbid redistribution.

---

## Users and Roles

- Sign-up and login from the app itself
- To promote to **admin**: `docker compose exec web php bin/console dbal:run-sql "UPDATE users SET roles = '[\"ROLE_ADMIN\"]' WHERE email = 'you@email'"`
- Registration has per-IP attempt limits and a honeypot field against bots
- All sensitive forms are **CSRF**-protected
- Controllers guarded with Symfony security attributes (`#[IsGranted]`)

---

## AI Assistant

The assistant uses **Groq** (Llama 3.1 8B Instant) in a two-step flow:

1. **Extraction**: the LLM parses the message and returns search parameters as JSON (route type, difficulty, region, sorting)
2. **Query**: the search runs against the DB with the extracted parameters
3. **Answer**: route cards + a conversational reply come back

Built-in protections:
- **Rate limiting** per IP (Symfony RateLimiter)
- **Off-topic guard**: regex patterns catch out-of-scope questions without calling the API
- **Spam lockout**: after 5 off-topic messages the session is blocked
- **History cap**: max 10 message pairs to control tokens

To use the assistant you need a key from the [Groq Console](https://console.groq.com).

---

## SEO

- Dynamic **sitemap** at `/sitemap.xml` with all routes and locations
- **`robots.txt`** blocking private routes and referencing the sitemap
- Explicit **canonical URLs** on every public page (pagination included)
- **Open Graph** and **Twitter Cards** on all pages
- **Schema.org** (JSON-LD):
  - `Organization` + `WebSite` with `SearchAction` on the homepage
  - `SportsActivityLocation` + `BreadcrumbList` on route details
  - `AggregateRating` on rated routes
  - `Place` + `BreadcrumbList` on location pages
  - `ItemList` on the route listing
- `noindex` on private pages (profile, my routes, admin)

---

## Security

Security HTTP headers are added automatically to every response via `SecurityHeadersSubscriber`:

| Header                      | Value                                        |
|-----------------------------|----------------------------------------------|
| `X-Content-Type-Options`    | `nosniff`                                    |
| `X-Frame-Options`           | `DENY`                                       |
| `X-XSS-Protection`          | `1; mode=block`                              |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`            |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`        |
| `Permissions-Policy`        | camera, microphone disabled                  |
| `Content-Security-Policy`   | Strict policy with explicit sources          |

---

## Production deployment

climbup.es deploys **automatically** on merge to `main`
(`.github/workflows/deploy.yml`): GitHub Actions SSHes into the server, pulls the code,
installs dependencies, clears the cache and runs migrations. Everything landing on
`main` goes through review and CI.

The workflow is generic: each server's details live in repository configuration, not in
code, and if they are not configured (e.g. in a fork) the deployment simply does not run.

### Running your own installation

To deploy your fork on your own server:

1. **PHP 8.4** on the server. On multi-version hostings (Plesk, cPanel), point to the full
   path of the 8.4 binary: the system `php` may be older and Composer will refuse to start.
2. Deploy as the **user who owns the web**, not root: a leaked key then only grants access
   to the web, not the whole server.
3. Create an SSH key just for deployment and authorize its public part in that user's
   `~/.ssh/authorized_keys`.
4. In your fork, under *Settings → Secrets and variables → Actions*:
   - **Secrets:** `SERVER_HOST`, `SERVER_USER` and `SSH_PRIVATE_KEY`.
   - **Variables:** `DEPLOY_PATH` (web folder on the server) and, if needed,
     `PHP_BIN` (path to PHP 8.4; defaults to `php`) and `COMPOSER_PHAR` (path to
     `composer.phar`; defaults to the `composer` command).
5. On the server, clone your fork into `DEPLOY_PATH` and create a `.env.local` with
   `APP_ENV=prod`, your own `APP_SECRET`, `DATABASE_URL` and `MAILER_DSN`. Never commit it.
6. The **ClimbUp** name and logo are not part of the license
   ([TRADEMARKS.md](TRADEMARKS.md)): use another name for your installation.

---

## E2E with Cypress

```bash
# Interactive
npx cypress open

# Headless
npx cypress run
```

Configure the URL and credentials with environment variables: `CYPRESS_BASE_URL`
(defaults to `http://localhost:8080`), `CYPRESS_USER_EMAIL` and `CYPRESS_USER_PASSWORD`.

---

## Application routes

| Route                         | Description                              | Access      |
|-------------------------------|------------------------------------------|-------------|
| `/`                           | Homepage                                 | Public      |
| `/route/user_routes`          | Route listing and filtering              | Public      |
| `/route/{id}`                 | Route detail                             | Public      |
| `/map`                        | Interactive area map                     | Public      |
| `/location/{id}`              | Routes in a location                     | Public      |
| `/juego`                      | Al Filo mini-game                        | Public      |
| `/asistente`                  | AI chatbot                               | Public      |
| `/sobre-mi`                   | About the project                        | Public      |
| `/login`, `/register`         | Authentication                           | Public      |
| `/perfil`                     | User profile management                  | User        |
| `/mis-rutas`                  | Saved routes and stats                   | User        |
| `/route`                      | Route CRUD (admin)                       | Admin       |
| `/route/admin`                | Admin dashboard and users                | Admin       |
| `/sitemap.xml`                | Dynamic XML sitemap                      | Public      |

---

## Project structure

```
.
├── .github/                # CI, deploy, issue/PR templates
├── config/                 # Symfony config (services, routes, security…)
├── cypress/                # E2E tests
├── data/sample_routes.csv  # Made-up sample data
├── docker/                 # nginx conf, Dockerfile
├── migrations/             # Doctrine migrations
├── public/                 # Document root (index.php, built assets)
│   ├── js/
│   ├── styles/
│   └── images/
├── src/                    # PHP code
│   ├── Command/
│   ├── Controller/
│   ├── Entity/
│   ├── Enum/
│   ├── EventSubscriber/
│   ├── Form/
│   ├── Repository/
│   └── Service/
├── templates/              # Twig views
├── tests/                  # PHPUnit (+ tests/js: game bot and reference runs)
├── docker-compose.yml      # Docker Compose (dev)
├── composer.json
├── .env.example            # Environment variable template
└── README.md
```

---

## Al Filo Mini-game

`/juego` is a pixel-art climbing game. The simulation is deterministic
(`public/js/game/sim.js`) and the server replays it with its own PHP copy
(`src/Service/Game/ClimbSimulation.php`) validating every run before it enters the
leaderboard. If you touch the simulation, read the game section in
[CONTRIBUTING.md](CONTRIBUTING.md).

---

## Contributing

Issues and pull requests are welcome. Everything you need (local environment, pre-PR
checks, how review works) is in [CONTRIBUTING.md](CONTRIBUTING.md). Participating means
accepting the [code of conduct](CODE_OF_CONDUCT.md).

---

## License

The code is released under the [GNU Affero General Public License v3.0 or later](LICENSE):
you may use, study, modify and redistribute it, and if you offer a modified version as a
web service, you must publish its source code too.

The **ClimbUp** name and logo are not part of the license: see [TRADEMARKS.md](TRADEMARKS.md).
