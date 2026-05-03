# Stage 1: Frontend bauen
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Produktions-Image
FROM node:22-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev
COPY --from=frontend-builder /app/dist ./dist
COPY server/ ./server/
RUN mkdir -p /data
EXPOSE 3000
CMD ["node", "server/index.js"]
