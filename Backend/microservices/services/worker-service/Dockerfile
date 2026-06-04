FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/worker-service/package.json services/worker-service/package.json
RUN npm install --workspace services/worker-service
COPY services/worker-service services/worker-service
CMD ["npm", "--workspace", "services/worker-service", "start"]
