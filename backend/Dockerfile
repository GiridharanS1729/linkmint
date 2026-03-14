FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate

EXPOSE 3000
CMD ["sh", "-c", "until npx prisma migrate deploy; do echo waiting for db; sleep 2; done && npm run prisma:seed && npm run dev"]
