# syntax=docker/dockerfile:1

# The web client is a static export. Nothing here runs at request time, which is
# why the runtime stage is a web server and not Node.

FROM node:22-slim AS builder

WORKDIR /app

# The lockfile first, so a code change does not reinstall the world.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# The API's address is baked in at build time — Expo inlines EXPO_PUBLIC_*
# variables into the bundle. That means one image per environment, which is the
# honest consequence of a static export rather than something to work around
# with a placeholder nobody remembers to replace.
ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}

RUN npx expo export --platform web --output-dir dist


FROM nginx:1.27-alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/security-headers.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q --spider http://127.0.0.1/ || exit 1
