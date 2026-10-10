# syntax=docker/dockerfile:1

# ---- build: static Astro + Starlight site ------------------------------------
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ENV ASTRO_TELEMETRY_DISABLED=1

# `npm run build` = astro check + astro build + the CSP hash check.
RUN npm run build

# ---- runtime: unprivileged nginx ---------------------------------------------
FROM nginxinc/nginx-unprivileged:1.30-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Fail the image build, not the deploy, if the generated config is invalid.
RUN nginx -t

# 3000, like the homepage image: what bb-infrastructure's Service targets.
EXPOSE 3000

# Kubernetes' rolling update waits for readiness; the healthcheck is for local runs.
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/healthz || exit 1
