FROM node:22-slim

# ffmpeg provides ffprobe, which reads each uploaded video's real length.
# tini reaps zombie child processes.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg openssl ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--"]
# Migrations run on every boot (no-op when already applied).
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
