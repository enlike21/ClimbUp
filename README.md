# ClimbUP - Plataforma de Rutas de Escalada 🧗‍♂️

## 🚀 Descripción
**ClimbUP** es una plataforma innovadora para escaladores, diseñada para explorar rutas de escalada, gestionarlas y calificarlas. Ofrece una experiencia fluida y profesional para usuarios y administradores.

---

## 🛠 Tecnologías Utilizadas
| Tecnología  | Descripción |
|------------|------------|
| ![Symfony](https://img.shields.io/badge/Symfony-6.4-blue?style=flat&logo=symfony) | Backend PHP con Symfony 6.4 |
| ![MySQL](https://img.shields.io/badge/MySQL-Database-informational?style=flat&logo=mysql) | Base de datos relacional |
| ![Twig](https://img.shields.io/badge/Twig-Templating-green?style=flat&logo=twig) | Motor de plantillas |
| ![Bootstrap](https://img.shields.io/badge/Bootstrap-5.0-purple?style=flat&logo=bootstrap) | Estilización y diseño UI |
| ![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow?style=flat&logo=javascript) | Dinamismo del frontend |
| ![Leaflet](https://img.shields.io/badge/Leaflet-Maps-green?style=flat&logo=leaflet) | Integración con OpenStreetMap |
| ![Cypress](https://img.shields.io/badge/Cypress-E2E-red?style=flat&logo=cypress) | Pruebas End-to-End |
| ![Docker](https://img.shields.io/badge/Docker-Containerization-blue?style=flat&logo=docker) | Virtualización para desarrollo |

---

## 📥 Instalación
### 1️⃣ Requisitos previos
- PHP 8.1+
- Composer
- Symfony CLI
- Docker (opcional para desarrollo local)

### 2️⃣ Clonar el repositorio
```bash
git clone https://github.com/enlike21/climbup.git
cd climbup
```

### 3️⃣ Instalar dependencias
```bash
composer install
npm install
```

### 4️⃣ Configurar variables de entorno
Renombrar `.env.local.example` a `.env.local` y modificar:
```bash
DATABASE_URL="mysql://root:@mysql/escalada_db"
```

### 5️⃣ Ejecutar migraciones
```bash
php bin/console doctrine:migrations:migrate
```

### 6️⃣ Levantar el servidor
```bash
docker-compose up -d
```

---

## 🌟 Características Principales
✅ **Exploración de rutas:** Filtrar y buscar rutas de escalada por ubicación y tipo.  
✅ **Gestión de rutas:** Crear, editar y eliminar rutas, además de gestionar usuarios (solo administradores).  
✅ **Favoritos y progreso:** Guardar rutas en "Por Hacer" y marcarlas como completadas.  
✅ **Mapa interactivo:** Visualización con Leaflet.js y OpenStreetMap.  
✅ **Autenticación y roles:** Diferenciación entre usuarios y administradores.  
✅ **Pruebas E2E:** Cypress para validar flujos principales.

---

## 🔐 Seguridad y Configuración
El sistema de seguridad se basa en `security.yaml`, estableciendo accesos según roles:
- **Usuarios:** Pueden explorar y gestionar rutas personales.
- **Administradores:** Tienen permisos completos sobre rutas y usuarios.

---

## 📡 API REST
Se puede exponer una API REST para integraciones externas, permitiendo la consulta de rutas y ubicaciones.

---

## 🛠 Contribución
Las contribuciones son bienvenidas. Para colaborar:
1. **Fork** del repositorio.
2. Crear una rama con la mejora o corrección.
3. Enviar un **Pull Request**.

---

## 📜 Licencia
Este proyecto está bajo una licencia **propietaria**. Su distribución y modificación están reguladas según los términos del repositorio.

---

🚀 **ClimbUP - Lleva tu escalada a otro nivel!** 🏔
