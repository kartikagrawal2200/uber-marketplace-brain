# Build context is ./frontend so the shared/ folder is available.
FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY driver-app ./driver-app
WORKDIR /app/driver-app
RUN npm install --no-audit --no-fund
EXPOSE 5174
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5174"]
