FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/order-service/package.json services/order-service/package.json
RUN npm install --workspace services/order-service
COPY services/order-service services/order-service
EXPOSE 3002
CMD ["npm", "--workspace", "services/order-service", "start"]
