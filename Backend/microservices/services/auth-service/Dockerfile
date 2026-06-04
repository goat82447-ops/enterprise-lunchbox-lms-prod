FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/auth-service/package.json services/auth-service/package.json
RUN npm install --workspace services/auth-service
COPY services/auth-service services/auth-service
EXPOSE 3003
CMD ["npm", "--workspace", "services/auth-service", "start"]
