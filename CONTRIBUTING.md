# Cómo contribuir a ClimbUp

¡Gracias por querer mejorar ClimbUp! Este documento explica cómo montar el proyecto en
local, qué esperamos de un pull request y cómo se revisa.

## Antes de empezar

- **Bugs y propuestas:** abre primero un [issue](../../issues/new/choose) con la plantilla
  que corresponda, sobre todo si el cambio es grande. Así acordamos el enfoque antes de que
  inviertas tiempo.
- **Vulnerabilidades de seguridad:** no abras un issue público. Sigue [SECURITY.md](SECURITY.md).
- **Código de conducta:** al participar aceptas el [código de conducta](CODE_OF_CONDUCT.md).

## Por dónde empezar

Si es tu primera contribución, mira los issues con la etiqueta
[`good first issue`](https://github.com/enlike21/ClimbUp/issues?q=is%3Aopen+label%3A%22good+first+issue%22):
son tareas acotadas y con contexto. Comenta en el issue que vas a por él para que nadie
más lo coja a la vez. Los que tienen [`help wanted`](https://github.com/enlike21/ClimbUp/issues?q=is%3Aopen+label%3A%22help+wanted%22)
son algo más grandes.

## Flujo de trabajo

1. Haz un **fork** del repo con el botón *Fork* de GitHub.
2. Clona tu fork y añade el repo original como `upstream`:
   ```bash
   git clone https://github.com/TU_USUARIO/ClimbUp.git climbup && cd climbup
   git remote add upstream https://github.com/enlike21/ClimbUp.git
   ```
3. Crea una rama a partir de `main` actualizado:
   ```bash
   git fetch upstream && git checkout -b mi-cambio upstream/main
   ```
4. Haz tus cambios, lanza las comprobaciones (ver más abajo) y sube la rama a tu fork.
5. Abre el pull request contra `main` de `enlike21/ClimbUp`.

## Montar el proyecto en local

Necesitas Docker y Docker Compose. Desde la carpeta de tu fork:

```bash
cp .env.example .env          # valores de desarrollo; cambia APP_SECRET por uno aleatorio
docker compose up -d --build     # la primera vez instala solo las dependencias (composer install)
docker compose logs -f web       # espera a ver "Iniciando PHP-FPM" y sal con Ctrl+C
docker compose exec web php bin/console doctrine:migrations:migrate --no-interaction
docker compose exec web php bin/console app:import-routes data/sample_routes.csv
```

Las migraciones crean todas las tablas desde cero en una base de datos vacía, y la CI lo
comprueba en cada pull request (job `fresh-install`).

La app queda en <http://localhost:8080>, el correo de desarrollo (Mailpit) en
<http://localhost:8025> y Adminer en <http://localhost:8082>.

`data/sample_routes.csv` son **vías y escuelas inventadas**, solo para desarrollar. No
añadas al repo datos copiados de otras webs de escalada: casi todas prohíben redistribuir su
contenido.

Para tener un usuario administrador, regístrate desde la app y después:

```bash
docker compose exec web php bin/console dbal:run-sql "UPDATE users SET roles = '[\"ROLE_ADMIN\"]' WHERE email = 'tu@email'"
```

El asistente IA necesita una clave de [Groq](https://console.groq.com) en `GROQ_API_KEY`;
el resto de la app funciona sin ella.

## Antes de abrir el pull request

Lanza lo mismo que lanza la CI:

```bash
composer cs-fix      # formatea el código PHP (reglas @Symfony)
composer phpstan     # análisis estático
composer test        # PHPUnit
```

Si tocas el minijuego **Al Filo**: la simulación vive en `public/js/game/sim.js` y el
servidor la repite línea a línea en `src/Service/Game/ClimbSimulation.php` para validar
las partidas. Cualquier cambio en una debe ir en las dos, subiendo `SIM_VERSION`, y
regenerando las partidas de referencia:

```bash
node tests/js/generate-game-fixtures.mjs
```

Si cambias algún archivo de `public/js/game/`, sube también el sufijo `?v=` de los imports
y de la plantilla `templates/game/index.html.twig`.

## Pull requests

- Una cosa por PR, con una descripción de qué cambia y por qué (la plantilla te guía).
- Si el PR resuelve un issue, escribe `Closes #123` en la descripción (en inglés: GitHub no
  entiende «Cierra»). Así el issue se cierra solo al fusionar y se te asigna automáticamente.
  Si es tu primera vez en ese issue, un bot te pedirá que dejes un comentario en él, porque
  GitHub solo deja asignar issues a quien ha participado en ellos.
- Añade o actualiza tests cuando cambie el comportamiento.
- Los mensajes de commit pueden ir en español o en inglés; que expliquen el porqué.
- La CI (estilo, PHPStan y tests) tiene que pasar, y un mantenedor revisará el PR antes de
  fusionarlo. Lo que se fusiona en `main` se despliega solo a producción, así que la
  revisión es obligatoria.

## Versiones

Cada vez que se fusiona un PR en `main`, [Release Drafter](.github/release-drafter.yml) actualiza
un borrador de la próxima versión en [Releases](../../releases), con los cambios agrupados
y un agradecimiento a quien los ha hecho. Las etiquetas del PR deciden dónde aparece y cómo
sube el número de versión:

| Etiqueta | Apartado en las notas | Versión |
|---|---|---|
| `enhancement` | ✨ Nuevas funcionalidades | sube la *minor* (1.**1**.0) |
| `bug` | 🐛 Arreglos | sube el *patch* (1.0.**1**) |
| `accessibility`, `documentation`, `refactor`, `dependencies` | su propio apartado | *patch* |
| `major` | — | sube la *major* (**2**.0.0) |
| `skip-changelog` | no aparece | — |

Los mantenedores ponen la etiqueta al revisar el PR y publican la versión cuando tiene
sentido.

## Licencia

Al contribuir aceptas que tu código se publique bajo la licencia del proyecto,
[AGPL-3.0-or-later](LICENSE). El nombre "ClimbUp" y el logo no forman parte de esa licencia
(ver [TRADEMARKS.md](TRADEMARKS.md)).
