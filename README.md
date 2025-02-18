# ClimbUP - Plataforma de Rutas de Escalada

## Descripción
**ClimbUP** es una plataforma diseñada para escaladores que permite explorar rutas de escalada, gestionarlas y calificarlas. Esta aplicación ofrece una experiencia intuitiva y eficiente tanto para usuarios como para administradores.

## Tecnologías Utilizadas
- **Backend:** Symfony 6.4 con PHP 8.1
- **Base de Datos:** mySQL
- **Frontend:** Twig, Bootstrap, JavaScript, Leaflet.js
- **Seguridad:** Symfony Security Bundle
- **Autenticación:** Login con hash de contraseñas seguras y roles de usuario
- **Manejo de Rutas:** Doctrine ORM
- **Paginación:** Pagerfanta
- **Mapas:** Leaflet.js con datos de OpenStreetMap

## Instalación
### 1. Requisitos previos
Asegúrate de tener instalados:
- PHP 8.1+
- Composer
- Symfony CLI
- Docker (opcional, para desarrollo local)

### 2. Clonar el repositorio
```bash
git clone https://github.com/usuario/climbup.git
cd climbup
```

### 3. Instalar dependencias
```bash
composer install
npm install
```

### 4. Configurar variables de entorno
Renombrar el archivo `.env.local.example` a `.env.local` y actualizar los valores correspondientes:
```bash
DATABASE_URL="mysql://root:@mysql/escalada_db"
```

### 5. Ejecutar migraciones
```bash
php bin/console doctrine:migrations:migrate
```

### 6. Ejecutar el servidor
```bash
symfony server:start
docker-compose up -d
```

### 7. Compilar assets
```bash
npm run build
```

## Características Principales
- **Exploración de rutas:** Ver y buscar rutas de escalada según ubicación y tipo.
- **Gestor de rutas:** Crear, editar y eliminar rutas (solo administradores).
- **Sistema de favoritos:** Guardar rutas en "Por Hacer" y marcarlas como completadas.
- **Mapa interactivo:** Ver todas las rutas en un mapa con Leaflet.js.
- **Autenticación y roles:** Diferenciación entre usuarios y administradores.

## Seguridad y Configuración
El sistema de seguridad se basa en `security.yaml` y proporciona protección de accesos según roles:
- **Usuarios:** Acceso a exploración y gestión personal de rutas.
- **Administradores:** Permisos para crear, editar y eliminar rutas.

## API REST (Opcional)
Para integraciones externas, la aplicación puede exponer una API REST para obtener rutas y ubicaciones.

## Despliegue en Producción
Para desplegar la aplicación en un servidor:
```bash
composer install --no-dev --optimize-autoloader
npm run build
php bin/console cache:clear --env=prod
```

## Contribución
Las contribuciones son bienvenidas. Para ello, crea un **fork**, realiza tus cambios y envía un **pull request**.

## Licencia
Este proyecto está bajo una licencia **propietaria**. Su distribución y modificación está regulada según los términos especificados en el repositorio.

