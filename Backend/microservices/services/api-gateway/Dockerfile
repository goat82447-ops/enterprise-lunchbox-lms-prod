FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/api-gateway/package.json services/api-gateway/package.json
RUN npm install --workspace services/api-gateway
COPY services/api-gateway services/api-gateway
EXPOSE 3000
CMD ["npm", "--workspace", "services/api-gateway", "start"]
