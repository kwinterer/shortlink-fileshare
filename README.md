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
- 🗄️ **Database Agnostic** - SQLite for development, easily switch to PostgreSQL
- ☁️ **Flexable Hosting** - Deploy locally, hybrid, or AWS
- 💾 **Storage Options** - local filesystem, MinIO, or AWS S3
- ⚖️ **Scalable** - Can be scaled for small to medium workloads
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

    #Google
    GOOGLE_CLIENT_ID=
    GOOGLE_CLIENT_SECRET=
    GOOGLE_CALLBACK_URL=

    #Database
    DATABASE_TYPE=sqlite or postgres
    DATABASE_SQLITE_PATH=path to sqlite db (if using sqlite)
    DATABASE_POSTGRES_NAME=
    DATABASE_POSTGRES_USER=
    DATABASE_POSTGRES_PASSWORD=
    DATABASE_POSTGRES_HOST=

    #Storage
    STORAGE_TYPE=local, aws, or minio
    UPLOAD_DIR=where to save files locally (if you chose to go locally)
    MINIO_ENDPOINT=
    MINIO_REGION=us-east-1 (or your chose of region)
    MINIO_ACCESS_KEY=
    MINIO_SECRET_KEY=
    MINIO_BUCKET=
    AWS_REGION=us-east-2 (or your chose of region)
    AWS_ACCESS_KEY_ID=
    AWS_SECRET_ACCESS_KEY=
    AWS_S3_BUCKET=
    
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
