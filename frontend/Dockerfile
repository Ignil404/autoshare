FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install
COPY . .
ARG VITE_API_BASE_URL=http://localhost
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN bun run build

FROM node:20-alpine AS server
WORKDIR /app
ENV NITRO_PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output

FROM nginx:stable-alpine
RUN apk add --no-cache nodejs
WORKDIR /app
COPY --from=server /app/.output ./.output
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY start.sh /start.sh
RUN chmod +x /start.sh
EXPOSE 80
CMD ["/start.sh"]
