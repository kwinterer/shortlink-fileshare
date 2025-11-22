# 📁 Personal Project: Shortlink Fileshare application
Node.js/Express.js application with Google OAuth authentication and short url generation

![Node.js](https://img.shields.io/badge/node.js-v22+-green)
![Express](https://img.shields.io/badge/express-4.x-blue)
![Sequelize](https://img.shields.io/badge/sequelize-6.x-orange)

## ✨ Features

- 🔐 **Google OAuth 2.0 Authentication**
- 📤 **Drag & Drop Upload**
- 🔗 **Shortlink Generation**
- 📊 **File Management Dashboard**
- 🗄️ **Database Agnostic** - SQLite for development, easily switch to PostgreSQL/MySQL
- 🚀 **Dockerfile included**
### Prerequisites

- Node.js v22 or higher
- npm or yarn
- Google OAuth credentials ([Docs here](https://developers.google.com/identity/protocols/oauth2))

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd shortlink-fileshare
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   
3. **Create .env file**
    ```HOST=
    PORT=
    SESSION_SECRET=some secret string like a guid
    GOOGLE_CLIENT_ID=
    GOOGLE_CLIENT_SECRET=
    GOOGLE_CALLBACK_URL=
    DATABASE_PATH=path to db
    UPLOAD_DIR=where to save files locally
    MAX_FILE_SIZE_MB=
    ```

5. **Run database migrations**
   ```bash
   npm run db:migrate
   ```
6. **Start the application**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```
