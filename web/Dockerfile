FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json .
RUN npm install

COPY src/ ./src/
COPY index.html .
COPY vite.config.ts .
COPY tsconfig.json .
COPY tailwind.config.js .
COPY postcss.config.js .

RUN npm run build

# Production stage with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
