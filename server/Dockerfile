FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p ./uploads
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "index.js"]