#!/bin/sh
set -e

echo "Clearing configurations..."
php artisan config:clear
php artisan route:clear
php artisan view:clear

exec "$@"
