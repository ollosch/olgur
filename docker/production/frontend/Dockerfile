##########################
# Stage 1: Build the SPA #
##########################
FROM oven/bun:1 AS builder

WORKDIR /app

# Baked into the JS bundle at build time — must be the production API origin
ARG VITE_API_BASE_URL
ARG VITE_COOKIE_URL
ARG VITE_APP_DEBUG=false

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Type-checking runs in CI/editor; vue-tsc's Node-only module resolution
# doesn't work under Bun's `node` shim, which is all this image provides.
RUN bun run build-only

###################################
# Stage 2: Serve with static nginx #
###################################
FROM nginx:1-alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
