FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 4001

ENV SERVICE_NAME=users-api
CMD ["node", "src/app.js"]