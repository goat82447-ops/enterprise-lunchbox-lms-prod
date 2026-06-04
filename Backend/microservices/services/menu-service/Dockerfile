FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/menu-service/package.json services/menu-service/package.json
RUN npm install --workspace services/menu-service
COPY services/menu-service services/menu-service
EXPOSE 3001
CMD ["npm", "--workspace", "services/menu-service", "start"]
