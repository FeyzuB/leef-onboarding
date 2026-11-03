#!/bin/sh
set -e

./node_modules/.bin/prisma migrate deploy
node prisma/seed.mjs
exec ./node_modules/.bin/next start -p "${PORT:-3000}"
