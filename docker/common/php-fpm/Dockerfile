########################################################
# Stage 1: Build environment and Composer dependencies #
########################################################
FROM php:8.5-fpm AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    libonig-dev \
    libssl-dev \
    libxml2-dev \
    libcurl4-openssl-dev \
    libicu-dev \
    libzip-dev \
 && docker-php-ext-install -j$(nproc) \
    intl \
    pdo_mysql \
    soap \
    sockets \
    zip \
 && pecl install redis \
 && docker-php-ext-enable redis \
 && apt-get autoremove -y && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /var/www

# `composer install` may trigger scripts that need access to the entire app code
COPY ./backend /var/www

##########################################################
# Stage 2: Shared base — extensions installed, no app code
##########################################################
FROM php:8.5-fpm AS base

# Runtime libraries required by the PHP extensions copied from builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    libicu-dev \
    libzip-dev \
    libfcgi-bin \
    procps \
 && apt-get autoremove -y \
 && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Copy compiled extensions and their config from the builder stage
COPY --from=builder /usr/local/lib/php/extensions/ /usr/local/lib/php/extensions/
COPY --from=builder /usr/local/etc/php/conf.d/ /usr/local/etc/php/conf.d/
COPY --from=builder /usr/local/bin/docker-php-ext-* /usr/local/bin/

# Install php-fpm-healthcheck
# SHA-256 is pinned to v0.5.0 — update the hash when upgrading the version
RUN curl -fsSL -o /usr/local/bin/php-fpm-healthcheck \
    https://raw.githubusercontent.com/renatomefi/php-fpm-healthcheck/v0.5.0/php-fpm-healthcheck \
 && echo "8a457d0c027feab1c0fc2aae62c30133ab18a116a802649a711953cf66b31b57  /usr/local/bin/php-fpm-healthcheck" \
    | sha256sum --check \
 && chmod +x /usr/local/bin/php-fpm-healthcheck

# Enable PHP-FPM status page (required by php-fpm-healthcheck)
RUN printf '[www]\npm.status_path = /status\n' > /usr/local/etc/php-fpm.d/zz-status.conf

EXPOSE 9000

###################################
# Stage 3: Production environment #
###################################
FROM base AS production

# Use the recommended production PHP configuration
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

# Laravel uses $_ENV to retrieve environment variables;
# include E in variables_order so it is populated
RUN sed -i 's/variables_order = "GPCS"/variables_order = "EGPCS"/' "$PHP_INI_DIR/php.ini"

# Copy the full application (with all dependencies) from builder
COPY --from=builder /var/www /var/www

# Copy a clean storage skeleton for runtime initialisation in the entrypoint
COPY ./backend/storage /var/www/storage-init

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /var/www

# Run composer with production flags to strip dev dependencies and optimise autoloader
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress --prefer-dist \
 && rm /usr/local/bin/composer

# Lock down ownership; www-data will run php-fpm
RUN chown -R www-data:www-data /var/www

COPY ./docker/production/php-fpm/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER www-data

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]

##############################
# Stage 4: Development image #
##############################
FROM base AS development

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

ARG UID=1000
ARG GID=1000

ARG XDEBUG_ENABLED=true
ARG XDEBUG_MODE=off
ARG XDEBUG_HOST=host.docker.internal
ARG XDEBUG_IDE_KEY=DOCKER
ARG XDEBUG_LOG=/dev/stdout
ARG XDEBUG_LOG_LEVEL=0

RUN if [ "${XDEBUG_ENABLED}" = "true" ]; then \
    pecl install xdebug && \
    docker-php-ext-enable xdebug && \
    echo "xdebug.mode=${XDEBUG_MODE}" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini && \
    echo "xdebug.idekey=${XDEBUG_IDE_KEY}" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini && \
    echo "xdebug.log=${XDEBUG_LOG}" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini && \
    echo "xdebug.log_level=${XDEBUG_LOG_LEVEL}" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini && \
    echo "xdebug.client_host=${XDEBUG_HOST}" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini && \
    echo "xdebug.start_with_request=trigger" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini ; \
fi

# Create a user matching the host UID/GID to avoid volume permission issues
RUN if getent group ${GID}; then \
      group_name=$(getent group ${GID} | cut -d: -f1); \
      useradd -m -u ${UID} -g ${GID} -s /bin/bash www; \
    else \
      groupadd -g ${GID} www && \
      useradd -m -u ${UID} -g www -s /bin/bash www; \
      group_name=www; \
    fi

RUN sed -i "s/user = www-data/user = www/g" /usr/local/etc/php-fpm.d/www.conf && \
    sed -i "s/group = www-data/group = $group_name/g" /usr/local/etc/php-fpm.d/www.conf

COPY ./docker/development/php-fpm/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /var/www

USER www

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]
