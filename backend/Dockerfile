FROM node:18-alpine

# 建立工作目錄
WORKDIR /app

# 複製 package.json 並安裝依賴
COPY package.json package-lock.json* ./
RUN npm install --production

# 複製專案原始碼
COPY . .

# 暴露後端預設埠，預設為 4000
EXPOSE 4000

# 啟動指令
CMD ["npm", "run", "start"]
