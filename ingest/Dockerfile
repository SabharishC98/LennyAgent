FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json .

# Install dependencies
RUN npm install

# Copy source
COPY src/ ./src/
COPY tsconfig.json .

# One-shot container; exits after ingest completes
CMD ["npx", "tsx", "src/ingest.ts"]
