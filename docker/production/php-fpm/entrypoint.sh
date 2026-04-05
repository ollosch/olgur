#!/bin/sh
set -e

# Ensure Laravel's writable directories have correct permissions.
# Ownership is set at build time (chown -R www-data); this only fixes
# mode so php-fpm (running as www-data) can actually write to them.
echo "Setting storage permissions..."
chmod -R 775 /var/www/storage /var/www/bootstrap/cache

echo "Running database migrations..."
php artisan migrate --force

echo "Caching configurations..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

exec "$@"
