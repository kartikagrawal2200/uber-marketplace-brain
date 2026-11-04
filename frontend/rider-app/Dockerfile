# Build context is ./frontend so the shared/ folder is available.
FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY rider-app ./rider-app
WORKDIR /app/rider-app
RUN npm install --no-audit --no-fund
EXPOSE 5173
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"]
