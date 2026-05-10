ARG BUILD_FROM=ghcr.io/home-assistant/base:3.23@sha256:5ea71eca9735949b080a05d271988c9663af3bd1050297abedefa222c61e6807

FROM oven/bun:1.3.13-alpine@sha256:4de475389889577f346c636f956b42a5c31501b654664e9ae5726f94d7bb5349 AS build
WORKDIR /build

COPY package.json bun.lock tsconfig.json ./
RUN bun install --frozen-lockfile --production

COPY src ./src
RUN bun run build

FROM ${BUILD_FROM}
ARG BUILD_ARCH
ARG BUILD_VERSION

ENV HOST=0.0.0.0 \
    NODE_ENV=production \
    PORT=3000

COPY run.sh /run.sh

# hadolint ignore=DL3018
RUN apk add --no-cache libstdc++ \
    && chmod a+x /run.sh

COPY --from=build /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app/dist
COPY --from=build /build/dist ./

EXPOSE 3000

LABEL io.hass.version="${BUILD_VERSION}" \
      io.hass.type="app" \
      io.hass.arch="${BUILD_ARCH}" \
      org.opencontainers.image.title="Home Assistant Health" \
      org.opencontainers.image.description="Family health tracker for Home Assistant" \
      org.opencontainers.image.source="https://github.com/matcra587/homeassistant-health/tree/main/health-tracker" \
      org.opencontainers.image.licenses="MIT"

CMD ["/run.sh"]
