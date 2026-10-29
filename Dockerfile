# emblazon preview + emblem API. No dependencies to install: Node runs the TypeScript directly.
FROM node:26-alpine

WORKDIR /app
COPY package.json server.ts ./
COPY src ./src
COPY scripts/lib ./scripts/lib
COPY assets/CREDITS.md ./assets/CREDITS.md

ENV PORT=4747
EXPOSE 4747
USER node

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- "http://localhost:${PORT}/heraldry/health.svg" > /dev/null || exit 1

CMD ["node", "server.ts"]
