FROM node:20-alpine

WORKDIR /app

# Install build dependencies if needed
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for tsx)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy application source
COPY . .

# Expose no ports since worker is a background task processor
ENV NODE_ENV=production

CMD ["npm", "run", "worker"]
