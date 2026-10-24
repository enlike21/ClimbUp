#!/bin/bash
# docker/entrypoint.sh

set -e

# A fresh clone has no vendor/ yet (the project folder is mounted over the image's copy),
# and without it bin/console can't even start - install the dependencies first.
if [ ! -f vendor/autoload.php ]; then
  echo "📦 Instalando dependencias (composer install), la primera vez tarda un poco..."
  composer install --no-interaction --prefer-dist
fi

echo "⏳ Esperando a que la base de datos esté lista..."

# Wait for database to be ready
until php bin/console dbal:run-sql "SELECT 1" > /dev/null 2>&1; do
  echo "   Base de datos no está lista, esperando..."
  sleep 2
done

echo "✅ Base de datos lista."

# Clear cache
echo "🧹 Limpiando caché..."
php bin/console cache:clear --no-warmup

# Warm up cache
echo "🔥 Precalentando caché..."
php bin/console cache:warmup

echo "🚀 Iniciando PHP-FPM..."
exec php-fpm