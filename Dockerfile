# Builder
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
# Skip postinstall (prisma generate): the schema is copied in the next step.
RUN npm ci --ignore-scripts
COPY . .
RUN npx prisma generate && npm run build

# Production image
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
# The app writes its page cache under .next at runtime, so the node user must own it.
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --spider http://localhost:3000/api/health || exit 1

# Applies migrations, seeds what is missing, then starts the app.
CMD ["sh", "docker-entrypoint.sh"]
