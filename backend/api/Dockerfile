ARG TARGETPLATFORM
FROM --platform=$TARGETPLATFORM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Copy shared prisma schema if mounted at /app/prisma
RUN npx prisma generate || true
EXPOSE 4000
CMD ["npm", "run", "start"] 