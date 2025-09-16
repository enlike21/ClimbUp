# ClimbUP — Plataforma de Rutas de Escalada 🧗‍♂️

**ClimbUP** es una plataforma web para explorar, gestionar y seguir rutas de escalada. Permite consultar rutas en un **mapa interactivo**, guardar favoritas, marcarlas como completadas y administrarlas con roles y permisos.

---

## Tabla de Contenidos

- [Tecnologías](#tecnologías)
- [Arquitectura & Módulos](#arquitectura--módulos)
- [Requisitos](#requisitos)
- [Configuración de entorno](#configuración-de-entorno)
- [Arranque rápido con Docker](#arranque-rápido-con-docker)
- [Base de datos: migraciones e importación de dump](#base-de-datos-migraciones-e-importación-de-dump)
- [Usuarios & Roles](#usuarios--roles)
- [E2E con Cypress](#e2e-con-cypress)
- [Rutas principales de la aplicación](#rutas-principales-de-la-aplicación)
- [Despliegue en producción (resumen)](#despliegue-en-producción-resumen)
- [Buenas prácticas y seguridad](#buenas-prácticas-y-seguridad)
- [Solución de problemas](#solución-de-problemas)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Contribución](#contribución)
- [Licencia](#licencia)

---

## Tecnologías

| Capa            | Tecnología                                                          |
|-----------------|----------------------------------------------------------------------|
| Backend         | **Symfony** (PHP 8.2+), **Doctrine ORM**                             |
| Frontend        | **Twig**, **Leaflet** (OpenStreetMap) para mapas |
| Base de datos   | **MariaDB/MySQL**                                                    |
| Infra (dev)     | **Docker Compose**: php-fpm, **Nginx**, MariaDB, Adminer      |
| Testing         | **Cypress** (End-to-End)                                             |

---

## Arquitectura & Módulos

- **Módulo público**: listado de rutas, mapa interactivo, detalle de ruta.
- **Área de usuario**: guardar rutas como “por hacer”, marcarlas como **completadas**, y gestionar perfil.
- **Administración**: crear/editar/eliminar rutas y ubicaciones (rutas protegidas por rol).
- **API interna (JSON)**: endpoints de **ubicaciones** y **rutas por ubicación** para alimentar el mapa.
- **Seguridad**: autenticación, autorización por roles, **CSRF** en formularios sensibles.

---

## Requisitos

- **Opción recomendada**: Docker + Docker Compose  
- **Opción clásica**: PHP 8.2+, Composer, (opcional) Symfony CLI  
- (Opcional) Node 18+ si quieres ejecutar Cypress fuera de Docker

---

## Configuración de entorno

Este repo **no incluye** `.env` con secretos. Debes crear el tuyo a partir de la plantilla:

```bash
cp .env.example .env
```

Edita los placeholders del `.env` (no los subas al repo).  
**Plantilla sugerida** (`.env.example`):

```dotenv
###> symfony/framework-bundle ###
APP_ENV=dev
APP_DEBUG=1
APP_SECRET=ChangeMeToAStrongRandomValue
###< symfony/framework-bundle ###

###> doctrine/doctrine-bundle ###
# Docker local (servicio "database")
DATABASE_URL="mysql://user:userpassword@database:3306/escalada_db?serverVersion=10.6&charset=utf8mb4"
###< doctrine/doctrine-bundle ###

###> symfony/mailer ###
# Correo en desarrollo con Mailpit (contenedor "mailer")
MAILER_DSN=smtp://mailer:1025
###< symfony/mailer ###

###> symfony/messenger ###
MESSENGER_TRANSPORT_DSN=doctrine://default
###< symfony/messenger ###

# Cypress (desarrollo)
CYPRESS_BASE_URL=http://localhost:8080
CYPRESS_USER_EMAIL=admin@example.com
CYPRESS_USER_PASSWORD=changeme123
```

> **Importante**: Mantén `.env` y `.env.*` fuera del control de versiones (usa solo `.env.example` en el repo). No subas dumps `*.sql` ni backups.

---

## Arranque rápido con Docker

Desde la raíz del proyecto:

```bash
cp .env.example .env

docker compose up -d --build

docker compose exec web composer install --no-interaction

docker compose exec web php bin/console cache:clear
```

**URLs por defecto**

- App: **http://localhost:8080**
- Adminer (DB web): **http://localhost:8082** *(si está incluido)*
- Mailpit (UI): **http://localhost:8025** (SMTP en 1025)

**Notas de red/puertos**

- **Nginx** sirve la app en `8080 → 80` (host → contenedor).  
- **php-fpm** no expone puertos al host (solo `expose: 9000` para Nginx).  
- En desarrollo, puedes publicar `3306:3306` para conectar con DBeaver; en producción **no** publiques la BD.

---

## Base de datos: migraciones e importación de dump

Tienes dos caminos: **migraciones** o **importar** un **dump SQL**.

### Opción A) Esquema vacío + migraciones

```bash
docker compose exec web php bin/console doctrine:migrations:migrate --no-interaction
```

Crea después usuarios desde la UI o vía DB.

### Opción B) Importar dump SQL

**Con DBeaver (GUI)**  
1. Conexión nueva → MariaDB/MySQL  
   - Host: `localhost`  
   - Puerto: `3306`  
   - DB: `escalada_db`  
   - Usuario: `user` / Password: `userpassword`  
2. Ejecuta tu `dump.sql` sobre `escalada_db`.

**Por consola (rápido)**

```bash
docker compose exec -T database sh -c 'mysql -uuser -puserpassword escalada_db' < ./ruta/a/tu_dump.sql
```

> Si tu dump ya trae **esquema + datos**, puede que **no necesites migraciones** (y si las ejecutas, podrían chocar). Importa primero y evalúa.

---

## Usuarios & Roles

- Registro/login de usuarios desde la propia app.
- Para elevar a **admin**, establece el campo `roles` en la tabla de usuarios como JSON `["ROLE_ADMIN"]` (vía DBeaver o script).
- Formularios protegidos con **CSRF**.  
- Controladores con anotaciones/atributos de seguridad en rutas sensibles.

---

## E2E con Cypress

Configura `baseUrl` y credenciales vía variables de entorno:

```js
// cypress.config.js (ejemplo)
module.exports = {
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost:8080",
    env: {
      USER_EMAIL: process.env.CYPRESS_USER_EMAIL,
      USER_PASSWORD: process.env.CYPRESS_USER_PASSWORD
    }
  }
}
```

Comandos:

```bash
# Interactivo
npx cypress open

# Headless
npx cypress run
```

**Recomendaciones**

- Usa `cy.session()` para cachear el login entre tests.
- Añade `data-testid` a elementos clave para selectores robustos.
- No hardcodees credenciales en los specs; usa `Cypress.env()`.

---

## Rutas principales de la aplicación

- **/** — Home / dashboard básico  
- **/login**, **/register**, **/logout** — Autenticación  
- **/map** — Mapa interactivo (Leaflet + OSM)  
- **/user_routes** — Listado/gestión de rutas de usuario (favoritas/completadas)  
- **/perfil**, **/mis-rutas** — Área de usuario  
- **/admin** — Administración (protegido por rol)

**API (interno para el mapa)**

- **/api/locations** — Listado de ubicaciones  
- **/api/routes-by-location/{id}** — Rutas por ubicación

> Para exponer públicamente una API estable, utiliza **Serializer + groups** y añade **cabeceras de caché**.

---

## Solución de problemas

- **502/Bad Gateway**: Nginx no alcanza php-fpm → asegúrate de que `web` (php-fpm) **no** expone puertos y Nginx hace `fastcgi_pass web:9000`.  
- **No conecta DBeaver**: publica `3306:3306` en `database` en dev o usa Adminer.  
- **Migraciones chocan con dump**: si ya importaste un dump con esquema, omite migraciones o revísalas.  
- **Permisos en `var/`**:
  ```bash
  docker compose exec web sh -lc 'chown -R www-data:www-data var && chmod -R u+rwX,g+rwX var'
  ```
- **Cypress no encuentra elementos**: añade `data-testid` y evita `{force:true}`; usa `cy.session()` para login.

---

## Estructura del proyecto

```
.
├─ assets/                 # estáticos (si aplica)
├─ bin/
├─ config/
├─ cypress/                # tests E2E
├─ docker/                 # conf nginx, mailer, scripts; sin datos ni dumps
├─ migrations/             # Doctrine migrations
├─ public/                 # document root (nginx)
├─ src/                    # código Symfony
├─ templates/              # vistas Twig
├─ translations/
├─ compose.yaml            # stack base dev
├─ composer.json
├─ .env.example            # plantilla sin secretos
└─ README.md
```

---

## Contribución

1. Fork del repositorio  
2. Rama `feature/mi-cambio`  
3. Ejecuta tests y prepara PR con pasos de prueba