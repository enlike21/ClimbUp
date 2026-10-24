# ClimbUp — Plataforma de Rutas de Escalada

**ClimbUp** es una plataforma web para descubrir, gestionar y seguir rutas de escalada en España. Permite explorar rutas en un **mapa interactivo**, guardarlas, registrar ascensos, consultar estadísticas personales y contar con un **asistente IA** especializado en escalada.

🌐 **Producción:** [climbup.es](https://climbup.es)

ClimbUp es **software libre** ([AGPL-3.0-or-later](LICENSE)) y acepta contribuciones: lee
[CONTRIBUTING.md](CONTRIBUTING.md) para montar el proyecto y abrir tu primer pull request.
Los problemas de seguridad se informan en privado, según [SECURITY.md](SECURITY.md).

---

## Tabla de Contenidos

- [Stack](#stack)
- [Funcionalidades](#funcionalidades)
- [Arquitectura](#arquitectura)
- [Requisitos](#requisitos)
- [Arranque rápido con Docker](#arranque-rápido-con-docker)
- [Configuración de entorno](#configuración-de-entorno)
- [Base de datos](#base-de-datos)
- [Usuarios y Roles](#usuarios-y-roles)
- [Asistente IA](#asistente-ia)
- [Minijuego Al Filo](#minijuego-al-filo)
- [SEO](#seo)
- [Seguridad](#seguridad)
- [Despliegue en producción](#despliegue-en-producción)
- [E2E con Cypress](#e2e-con-cypress)
- [Rutas de la aplicación](#rutas-de-la-aplicación)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Contribuir](#contribuir)
- [Licencia](#licencia)

---

## Stack

| Capa           | Tecnología                                                     |
|----------------|----------------------------------------------------------------|
| Backend        | **Symfony 7.4**, PHP 8.4, Doctrine ORM                         |
| Frontend       | **Twig**, CSS propio, GSAP, Leaflet (OpenStreetMap)            |
| Base de datos  | **MariaDB 10.6**                                               |
| IA             | **Groq API** (Llama 3.1 8B Instant)                            |
| Infra (dev)    | Docker Compose: php-fpm, Nginx, MariaDB, Mailpit, Adminer      |
| Infra (prod)   | **Plesk** (Ubuntu 24.04), GitHub Actions CI/CD                 |
| Testing        | **PHPUnit**, **PHPStan**, PHP CS Fixer, **Cypress** (E2E)      |

---

## Funcionalidades

### Área pública
- **Homepage** con estadísticas en tiempo real (rutas, escaladores, ubicaciones)
- **Listado de rutas** con filtros combinables: tipo, dificultad, región, ubicación y ordenación
- **Mapa interactivo** (Leaflet + OpenStreetMap) con marcadores por zona y rutas asociadas
- **Detalle de ruta**: información completa, dificultad, longitud, sector, valoración y ubicación en mapa
- **Página por localización**: todas las rutas de una zona con sus datos

### Área de usuario (requiere login)
- Guardar rutas como **"por hacer"**
- Marcar rutas como **completadas** con fecha
- **Estadísticas personales**: rutas completadas, distribución por región y por grado, máximo grado alcanzado, últimas completadas
- Gestión de **perfil**: nombre y contraseña (cambiarla pide la actual)
- **Al Filo**: minijuego de escalada con clasificación, reto diario y logros

### Administración (ROLE_ADMIN)
- CRUD completo de **rutas de escalada** y **ubicaciones**
- Gestión de **usuarios** con paginación
- Panel de estadísticas globales del sistema

### Asistente IA
- Chat en lenguaje natural para **buscar rutas** por tipo, grado, zona o características
- Muestra tarjetas de rutas con enlace directo al detalle
- Guarda historial de conversación en sesión (máx. 10 pares)
- Rate limiting y protección anti-spam incorporados

---

## Arquitectura

```
src/
├── Controller/
│   ├── Admin/          # AdminController, AdminRouteController
│   ├── Chatbot/        # ChatbotController
│   ├── Location/       # LocationController, MapController
│   ├── Route/          # RouteController
│   ├── Security/       # LoginController, RegistrationController
│   ├── User/           # ProfileController, SavedRoutesController
│   ├── HomeController
│   └── SitemapController
├── Entity/
│   ├── ClimbingRoute   # name, type, difficulty, pitches, length, rating, sector
│   ├── Location        # name, latitude, longitude, region
│   ├── User
│   ├── UserRoute       # ruta guardada por usuario
│   └── CompletedRoute  # ascenso registrado con fecha
├── Enum/
│   └── RouteType       # Deportiva | Tradicional | Boulder
├── Service/
│   ├── Ai/
│   │   ├── AiProviderInterface
│   │   ├── GroqProvider      # integración Groq API (Llama 3.1)
│   │   ├── ChatbotService    # lógica de conversación + búsqueda
│   │   └── PromptBuilder     # construcción de prompts del sistema
│   ├── GradeConversionService  # conversión YDS → escala francesa
│   └── StatisticsService       # stats con caché (Symfony Cache)
├── EventSubscriber/
│   └── SecurityHeadersSubscriber  # cabeceras HTTP de seguridad
└── Command/
    └── ImportRoutesCommand    # importación masiva de rutas desde CSV/JSON
```

### API interna (JSON para el mapa)

| Método | Endpoint                          | Descripción                    |
|--------|-----------------------------------|--------------------------------|
| GET    | `/api/locations`                  | Ubicaciones con su número de rutas |
| GET    | `/api/routes`                     | Todas las rutas con su ubicación |
| POST   | `/api/chat`                       | Enviar mensaje al asistente IA  |
| POST   | `/api/chat/clear`                 | Limpiar historial del chat      |
| POST   | `/api/juego/partida`              | Enviar una partida de Al Filo (el servidor la repite y valida) |
| POST   | `/api/juego/aspecto`              | Elegir aspecto del escalador    |

---

## Requisitos

- **Opción recomendada**: Docker + Docker Compose
- **Opción clásica**: PHP 8.4, Composer, Symfony CLI
- Node 18+ si ejecutas Cypress fuera de Docker
- Clave de API de **Groq** para el asistente IA

---

## Arranque rápido con Docker

```bash
cp .env.example .env
# Los valores de ejemplo sirven para desarrollar; cambia APP_SECRET por uno aleatorio
# y pon tu clave de Groq si quieres usar el asistente IA.

docker compose up -d --build

docker compose exec web composer install --no-interaction

docker compose exec web php bin/console doctrine:migrations:migrate --no-interaction

# Datos de ejemplo (vías y escuelas inventadas)
docker compose exec web php bin/console app:import-routes data/sample_routes.csv
```

**URLs disponibles**

| Servicio       | URL                        |
|----------------|----------------------------|
| Aplicación     | http://localhost:8080       |
| Adminer (DB)   | http://localhost:8082       |
| Mailpit (SMTP) | http://localhost:8025       |

---

## Configuración de entorno

Crea tu `.env` a partir de la plantilla (nunca subas el `.env` real al repo):

```bash
cp .env.example .env
```

Variables necesarias (las de `.env.example` ya funcionan con el Docker de desarrollo):

```dotenv
APP_ENV=dev
APP_SECRET=un_valor_aleatorio

# Base de datos local creada por docker-compose.yml (mantenlas en sync con DATABASE_URL)
DB_ROOT_PASSWORD=root
DB_NAME=escalada_db
DB_USER=climbup_app
DB_PASSWORD=climbup
DATABASE_URL="mysql://climbup_app:climbup@database:3306/escalada_db?serverVersion=10.6&charset=utf8mb4"

MESSENGER_TRANSPORT_DSN=doctrine://default?auto_setup=0
MAILER_DSN=smtp://mailer:1025   # Mailpit en dev
LOCK_DSN=flock

# Groq API (asistente IA, opcional)
GROQ_API_KEY=your_groq_api_key_here
```

Para Cypress, exporta `CYPRESS_BASE_URL`, `CYPRESS_USER_EMAIL` y `CYPRESS_USER_PASSWORD`
(un usuario de tu base de datos local) antes de lanzarlo.

---

## Base de datos

### Esquema

```bash
docker compose exec web php bin/console doctrine:migrations:migrate --no-interaction
```

### Datos de ejemplo

`data/sample_routes.csv` contiene 60 vías en 6 escuelas **inventadas**, para desarrollar sin
depender de datos de terceros:

```bash
docker compose exec web php bin/console app:import-routes data/sample_routes.csv
# --clean borra antes todas las rutas y ubicaciones
```

El comando acepta cualquier CSV con el mismo formato de columnas (el de las exportaciones
de Mountain Project). **No subas al repo datos de otras webs**: sus condiciones de uso no
suelen permitir redistribuirlos.

---

## Usuarios y Roles

- Registro y login desde la propia app
- Para elevar a **admin**: `docker compose exec web php bin/console dbal:run-sql "UPDATE users SET roles = '[\"ROLE_ADMIN\"]' WHERE email = 'tu@email'"`
- El registro tiene límite de intentos por IP y un campo trampa contra bots
- Todos los formularios sensibles están protegidos con **CSRF**
- Controladores protegidos con atributos de seguridad de Symfony (`#[IsGranted]`)

---

## Asistente IA

El asistente usa **Groq** (Llama 3.1 8B Instant) con un flujo en dos pasos:

1. **Extracción**: el LLM analiza el mensaje y devuelve parámetros de búsqueda en JSON (tipo de ruta, dificultad, región, ordenación)
2. **Consulta**: se ejecuta la búsqueda en la BD con los parámetros extraídos
3. **Respuesta**: se devuelven tarjetas de rutas + respuesta conversacional

Protecciones incorporadas:
- **Rate limiting** por IP (Symfony RateLimiter)
- **Guard de off-topic**: patrones regex detectan preguntas fuera de ámbito sin llamar a la API
- **Bloqueo por spam**: tras 5 mensajes off-topic la sesión queda bloqueada
- **Límite de historial**: máx. 10 pares de mensajes para controlar tokens

Para usar el asistente necesitas una clave de la [Groq Console](https://console.groq.com).

---

## SEO

- **Sitemap** dinámico en `/sitemap.xml` con todas las rutas y ubicaciones
- **`robots.txt`** con bloqueo de rutas privadas y referencia al sitemap
- **Canonical URLs** explícitos en todas las páginas públicas (incluyendo paginación)
- **Open Graph** y **Twitter Cards** en todas las páginas
- **Schema.org** (JSON-LD):
  - `Organization` + `WebSite` con `SearchAction` en la homepage
  - `SportsActivityLocation` + `BreadcrumbList` en detalle de ruta
  - `AggregateRating` en rutas con valoración
  - `Place` + `BreadcrumbList` en páginas de localización
  - `ItemList` en el listado de rutas
- `noindex` en páginas privadas (perfil, mis rutas, admin)

---

## Seguridad

Las cabeceras HTTP de seguridad se añaden automáticamente en cada respuesta vía `SecurityHeadersSubscriber`:

| Cabecera                    | Valor                                      |
|-----------------------------|--------------------------------------------|
| `X-Content-Type-Options`    | `nosniff`                                  |
| `X-Frame-Options`           | `DENY`                                     |
| `X-XSS-Protection`          | `1; mode=block`                            |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`          |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`      |
| `Permissions-Policy`        | camera, microphone desactivados            |
| `Content-Security-Policy`   | Política estricta con fuentes explícitas   |

---

## Despliegue en producción

climbup.es se despliega **automáticamente** al fusionar en `main`
(`.github/workflows/deploy.yml`): GitHub Actions entra por SSH al servidor, actualiza el
código, instala dependencias, limpia la caché y ejecuta las migraciones. Las credenciales
del servidor viven en los secretos del repositorio y el workflow no se ejecuta en forks.

Por eso todo lo que entra en `main` pasa por revisión y por la CI.

---

## E2E con Cypress

```bash
# Interactivo
npx cypress open

# Headless
npx cypress run
```

Configura la URL y las credenciales con variables de entorno: `CYPRESS_BASE_URL` (por
defecto `http://localhost:8080`), `CYPRESS_USER_EMAIL` y `CYPRESS_USER_PASSWORD`.

---

## Rutas de la aplicación

| Ruta                          | Descripción                              | Acceso      |
|-------------------------------|------------------------------------------|-------------|
| `/`                           | Homepage                                 | Público     |
| `/route/user_routes`          | Listado y filtrado de rutas              | Público     |
| `/route/{id}`                 | Detalle de una ruta                      | Público     |
| `/map`                        | Mapa interactivo de zonas                | Público     |
| `/location/{id}`              | Rutas de una localización                | Público     |
| `/juego`                      | Minijuego Al Filo                        | Público     |
| `/asistente`                  | Chatbot IA                               | Público     |
| `/sobre-mi`                   | Sobre el proyecto                        | Público     |
| `/login`, `/register`         | Autenticación                            | Público     |
| `/perfil`                     | Gestión de perfil de usuario             | Usuario     |
| `/mis-rutas`                  | Rutas guardadas y estadísticas           | Usuario     |
| `/route`                      | CRUD de rutas (admin)                    | Admin       |
| `/route/admin`                | Panel de administración y usuarios       | Admin       |
| `/sitemap.xml`                | Sitemap XML dinámico                     | Público     |

---

## Estructura del proyecto

```
.
├── .github/                # CI, deploy, plantillas de issues/PR, Dependabot
├── config/                 # Configuración Symfony (services, routes, security…)
├── cypress/                # Tests E2E
├── data/sample_routes.csv  # Datos de ejemplo inventados
├── docker/                 # nginx conf, Dockerfile
├── migrations/             # Doctrine migrations
├── public/                 # Document root (index.php, assets compilados)
│   ├── js/
│   ├── styles/
│   └── images/
├── src/                    # Código PHP
│   ├── Command/
│   ├── Controller/
│   ├── Entity/
│   ├── Enum/
│   ├── EventSubscriber/
│   ├── Form/
│   ├── Repository/
│   └── Service/
├── templates/              # Vistas Twig
├── tests/                  # PHPUnit (+ tests/js: bot y partidas de referencia del juego)
├── docker-compose.yml      # Docker Compose (dev)
├── composer.json
├── .env.example            # Plantilla de variables de entorno
└── README.md
```

---

## Minijuego Al Filo

`/juego` es un juego de escalada en pixel art. La simulación es determinista
(`public/js/game/sim.js`) y el servidor la repite con su propia copia en PHP
(`src/Service/Game/ClimbSimulation.php`) para validar cada partida antes de guardarla en
la clasificación. Si tocas la simulación, lee la sección del juego en
[CONTRIBUTING.md](CONTRIBUTING.md).

---

## Contribuir

Issues y pull requests son bienvenidos. Todo lo necesario (entorno local, comprobaciones
antes del PR, cómo se revisa) está en [CONTRIBUTING.md](CONTRIBUTING.md). Participar implica
aceptar el [código de conducta](CODE_OF_CONDUCT.md).

---

## Licencia

El código se publica bajo la [GNU Affero General Public License v3.0 o posterior](LICENSE):
puedes usarlo, estudiarlo, modificarlo y redistribuirlo, y si ofreces una versión modificada
como servicio web, debes publicar también su código fuente.

El nombre **ClimbUp** y el logo no forman parte de la licencia: ver [TRADEMARKS.md](TRADEMARKS.md).
