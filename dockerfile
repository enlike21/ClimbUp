FROM php:8.2-fpm-alpine

# System deps
RUN apk update && apk add --no-cache     bash     libxml2-dev     icu-dev     oniguruma-dev     zip     git     curl     mariadb-client  && docker-php-ext-install pdo pdo_mysql opcache intl

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy app
COPY . /var/www/html

# Install PHP deps (dev by default; in prod add --no-dev)
RUN composer install --no-interaction --prefer-dist || true

# Permissions
RUN chown -R www-data:www-data /var/www/html

# php-fpm listens on 9000
EXPOSE 9000

# Entrypoint: wait DB, run migrations, start php-fpm
COPY ./docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
CMD ["/entrypoint.sh"]
