FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ARG BACKEND_URL=http://backend:3001
ENV BACKEND_URL=${BACKEND_URL}

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV BACKEND_URL=http://backend:3001

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

EXPOSE 3000

CMD ["npm", "start"]
