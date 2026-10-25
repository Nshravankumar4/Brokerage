# SR Brokerage Ledger — Setup, Deployment & Rollback Guide

**Transport Brokerage Ledger Pvt Ltd**  
Developer: **Shravan Kumar**  
Version: **8.4 (Authoritative Master 28-Column Architecture)**

---

## 1. Running the Application Locally

The frontend is a lightweight Single-Page Application (SPA) requiring no Node.js compilation.

### Option A: Direct Browser Launch
Open `index.html` directly in any modern web browser (Google Chrome, Microsoft Edge, Brave, Firefox):
```
file:///E:/TR/P1/index.html
```

### Option B: Local Web Server (Recommended)
Using Python (if available):
```bash
python -m http.server 8080
```
Then navigate to: `http://localhost:8080`

Using VS Code Live Server / Any Static HTTP Server:
Serve directory `E:\TR\P1` and access via `http://127.0.0.1:5500`.

---

## 2. Default Login Credentials

Authentication is cryptographically enforced via SHA-256 password hashing in [`js/auth.js`](file:///e:/TR/P1/js/auth.js):

| Account | Role | Default Password | Permissions |
| :--- | :---: | :---: | :--- |
| **ADMIN** | Administrator | `admin123` | Full CRUD Control (Add, Edit, View, Delete, Settings) |
| **RUDRA** | Fleet Employee | `rudra123` | Operational Access (Add, Edit, View, Export — Delete is restricted) |

*Session Inactivity*: A 10-minute idle timer automatically locks the portal if no user activity is detected.

---

## 3. Google Apps Script Backend Deployment

The application features full 2-way cloud synchronization with Google Sheets via [`backend/Code.gs`](file:///e:/TR/P1/backend/Code.gs).

### Deployment Steps:
1. Open your target Google Spreadsheet (or create a new Google Sheet named `final`).
2. Open **Extensions > Apps Script** in the Google Sheet menu.
3. Replace the script editor code with the full contents of [`backend/Code.gs`](file:///e:/TR/P1/backend/Code.gs).
4. In **Project Settings > Script Properties**, set:
   - `SPREADSHEET_ID`: Your Google Sheet ID (from the URL `https://docs.google.com/spreadsheets/d/{ID}/edit`).
5. Click **Deploy > New deployment**:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the generated Web App URL (ends in `/exec`).
7. In the SR Brokerage Ledger application:
   - Click the **⚙️ Settings & API** menu item (Admin only).
   - Paste the Web App URL and Google Sheet ID.
   - Click **💾 Save Settings & Sync**.

---

## 4. Backup & Rollback Procedures

### Authoritative Backups:
- The master pre-modification Excel workbook is backed up at:
  ```
  E:\TR\P1\backups\Final_Sheet_Broker_backup.xlsx
  ```
- Application data in LocalStorage is versioned under key:
  ```
  broker_ledger_trips_v8_current_workbook
  ```

### Rollback Process:
1. **Workbook Rollback**: If the active workbook `Final Sheet Broker.xlsx` needs restoration, copy the backup:
   ```powershell
   Copy-Item -Path "backups\Final_Sheet_Broker_backup.xlsx" -Destination "Final Sheet Broker.xlsx" -Force
   ```
2. **Local Data Reset**: In the application, an Admin can click **Settings > Reset to Seed Data** or execute in the browser console:
   ```javascript
   DataManager.reset();
   ```
3. **Git Rollback**: The git repository at `E:\TR\P1` maintains commit history on branch `Upgrade_1.2`.
