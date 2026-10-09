FROM node:20-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy package files
COPY package.json .

# Install dependencies
RUN npm install

# Copy source
COPY src/ ./src/
COPY tsconfig.json .

EXPOSE 8001

# Use tsx to run TypeScript directly in dev/production
CMD ["npx", "tsx", "src/index.ts"]
