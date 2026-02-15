FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# --- Runner Stage ---
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

# Copy built assets and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

# Add debug script if it exists locally (optional, might fail if not in context, so ignore error)
COPY check-db-connection.js ./check-db-connection.js

EXPOSE 4001

# Debug: List dist folder to verify build, then run. 
# Note: If 'src' folder exists in dist, main is likely at dist/src/main.js due to rootDir structure
CMD ["sh", "-c", "echo 'Listing dist folder:' && ls -la dist && ls -la dist/src || true && npx prisma db push --skip-generate && if [ -f dist/main.js ]; then node dist/main; else node dist/src/main; fi"]
