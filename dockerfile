FROM php:8.2-fpm-alpine

# Instalar dependencias necesarias y actualizar paquetes vulnerables
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
        bash \
        libxml2-dev \
        icu-dev \
        oniguruma-dev \
        zip \
        git \
        curl \
        mariadb-client \
    && docker-php-ext-install pdo pdo_mysql opcache intl

# Instalar Composer (el gestor de dependencias de PHP)
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Establecer el directorio de trabajo
WORKDIR /var/www/html

# Copiar el código fuente de la aplicación al contenedor
COPY . /var/www/html

# Instalar las dependencias de Symfony
RUN composer install --no-interaction --prefer-dist --optimize-autoloader

# Establecer permisos para el directorio de Symfony
RUN chown -R www-data:www-data /var/www/html

# Exponer el puerto que usará el contenedor
EXPOSE 80

# Crear un script de entrada que ejecute las migraciones al iniciar
COPY ./docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Ejecutar el script de entrada
CMD ["/entrypoint.sh"]
