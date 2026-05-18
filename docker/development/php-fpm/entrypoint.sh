#!/bin/sh
set -e

echo "Installing Composer dependencies..."
composer install --no-interaction --no-progress --prefer-dist

echo "Clearing configurations..."
php artisan config:clear
php artisan route:clear
php artisan view:clear

exec "$@"
