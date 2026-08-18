FROM node:20-alpine AS prod

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 4000

CMD ["node", "src/server.js"]

# Hot reloading
FROM node:20-alpine AS dev
WORKDIR /src
ENV PORT=4000
ENV CORS_ORIGIN=http://localhost:3000
ENV MONGO_URI=mongodb://localhost:27017/pulseboard
ENV JWT_SECRET=replace-with-a-long-random-string
COPY package*.json ./
RUN npm install
COPY . .
CMD [ "npm", "run", "dev" ]