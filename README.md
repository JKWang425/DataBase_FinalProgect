# 小型診所掛號與預約系統 (DataBase_FinalProgect)

這是一套基於 React (前端) + Node.js/Express (後端) + MySQL (資料庫) 的診所掛號系統。支援**櫃台人員**、**醫生**與**病患**三種角色的專屬操作面板。

這份指南將協助團隊成員或教授在自己的電腦上快速架設並測試此系統。

---

## 🚀 快速啟動 (使用 Docker Compose)

最簡單且推薦的執行方式是使用 Docker。請確保你的電腦已安裝 [Docker Desktop](https://www.docker.com/products/docker-desktop/)。

### 步驟 1：準備環境變數設定檔

為保護敏感資訊，密碼檔案不會被提交到 GitHub。你需要在根目錄與前端目錄建立自己的 `.env` 檔案。

**1. 建立根目錄的 `.env` (給資料庫與後端使用)**
複製我們提供的範本：
```powershell
# Windows PowerShell
Copy-Item .env.example .env
```
*(或直接在檔案總管複製 `.env.example` 並重新命名為 `.env`)*

用編輯器打開剛剛建立的 `.env`，設定你的 MySQL 密碼與 JWT 金鑰。

**2. 建立前端目錄的 `.env` (給前端連線使用)**
複製前端的範本：
```powershell
Copy-Item frontend/.env.example frontend/.env
```
*(請確保 `frontend/.env` 裡面的內容是 `VITE_API_URL=http://localhost:4000`)*

### 步驟 2：啟動專案

打開終端機 (Terminal / PowerShell)，確保路徑位於專案根目錄 (有 `docker-compose.example.yml` 的那一層)。執行以下指令：

```powershell
docker-compose -f docker-compose.example.yml --env-file .env up --build -d
```
> *這會自動下載映像檔、建立資料庫、編譯後端與前端。第一次執行可能會需要幾分鐘。*

### 步驟 3：開始測試

當終端機顯示容器皆已啟動後，請打開瀏覽器前往：
- **前端介面 (系統入口)**：[http://localhost:5173](http://localhost:5173)
- **後端 API 測試位址**：[http://localhost:4000/api](http://localhost:4000/api) (通常不需要直接點擊)

---

## 👥 如何測試系統功能？

請依照以下流程進行系統的完整測試：

### 1. 註冊帳號
系統一開始是空的。請先在登入頁面點擊「註冊」，並**分別註冊三個不同角色的帳號**：
- 註冊一個角色為 **Patient (病患)** 的帳號 (例如帳號: `patient1`)
- 註冊一個角色為 **Staff (櫃台)** 的帳號 (例如帳號: `staff1`)
- 註冊一個角色為 **Doctor (醫師)** 的帳號 (例如帳號: `doctor1`)

*(注意：註冊時系統會自動在後端資料庫為你建立對應的 Patients/Staffs/Doctors 檔案)*

### 2. 測試流程建議
請利用你剛註冊好的三個帳號交互登入測試：
1. **櫃台 (Staff)** 登入：
   - 建立新的「門診排班」(選擇剛剛註冊的醫生、日期、診間、預約上限)。
   - 在櫃台面板查看所有預約狀態。
2. **病患 (Patient)** 登入：
   - 進入「預約掛號」分頁，選擇剛才櫃台建立的科別與醫師進行掛號。
   - 進入「我的掛號」查看掛號號碼，或嘗試取消掛號。
3. **醫師 (Doctor)** 登入：
   - 查看今日的待診名單。
   - 將病患狀態更改為「看診中」與「看診完畢」。
   - 點擊「填寫病歷」，輸入診斷結果與處置方式。
4. **病患 (Patient)** 再次登入：
   - 進入「歷史紀錄」分頁，確認是否能看見剛才醫生填寫的診斷與處置。

---

## 🛠️ 常用的 Docker 管理指令

如果你在開發或測試時遇到問題，可以使用以下指令：

- **查看運行中的容器狀態**
  ```powershell
  docker ps
  ```

- **查看後端伺服器的即時日誌 (看有沒有報錯)**
  ```powershell
  docker-compose -f docker-compose.example.yml --env-file .env logs -f backend
  ```

- **修改程式碼後，重新編譯並啟動**
  ```powershell
  docker-compose -f docker-compose.example.yml --env-file .env up --build -d
  ```

- **關閉系統並移除容器**
  ```powershell
  docker-compose -f docker-compose.example.yml --env-file .env down
  ```

---

## 🚫 安全注意事項 (給開發團隊)
- **千萬不要把 `.env` 檔案 commit 到 GitHub 上！**
- 如果要在不同電腦上執行，請重複上述的「步驟 1」重新建立 `.env`。
- 如果專案架構有新增環境變數需求，請將變數名稱(不要含真實密碼)更新到 `.env.example` 讓團隊知道。
