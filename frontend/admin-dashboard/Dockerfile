# Build context is ./frontend so the shared/ folder is available.
FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY admin-dashboard ./admin-dashboard
WORKDIR /app/admin-dashboard
RUN npm install --no-audit --no-fund
EXPOSE 5175
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5175"]
