FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY server ./server
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787 PUBLIC_MODE=true
EXPOSE 8787
CMD ["node", "server/index.mjs"]
