FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Vite dev server 會綁定到 0.0.0.0 以便外部存取
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
