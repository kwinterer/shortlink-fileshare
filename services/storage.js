const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const fs = require("fs").promises;
const path = require("path");
const { nanoid } = require("nanoid");

class StorageService {
  constructor(config) {
    this.type = config.type;

    if (this.type === "s3") {
      this.s3Client = new S3Client({
        endpoint: config.endpoint,
        region: config.region,
        credentials: config.credentials,
        forcePathStyle: config.forcePathStyle,
      });
      this.bucket = config.bucket;
    } else if (this.type === "local") {
      this.uploadDir = config.uploadDir || "./uploads";
      fs.mkdir(this.uploadDir, { recursive: true }).catch(console.error);
    }
  }

  async uploadFile(file, filename) {
    if (this.type === "s3") {
      const key = `uploads/${filename}`;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      return key;
    } else {
      const filePath = path.join(
        this.uploadDir,
        filename + path.extname(file.originalname)
      );
      await fs.writeFile(filePath, file.buffer);
      return filename;
    }
  }

  async getFile(fileRecord) {
    if (this.type === "s3") {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileRecord.filePath,
      });

      const response = await this.s3Client.send(command);

      return {
        stream: response.Body,
        contentType: response.ContentType,
      };
    } else {
      const filePath = path.join(this.uploadDir, fileRecord.storedName);
      const stream = require("fs").createReadStream(filePath);

      return {
        stream: stream,
      };
    }
  }

  async deleteFile(fileRecord) {
    if (this.type === "s3") {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: fileRecord.filePath,
        })
      );
    } else {
      const filePath = path.join(this.uploadDir, fileRecord.storedName);
      await fs.unlink(filePath);
    }
  }
}

function createStorageService() {
  const storageType = process.env.STORAGE_TYPE;

  let config;
  if (storageType === "aws") {
    config = {
      type: "s3",
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      bucket: process.env.AWS_S3_BUCKET || "shortlink-fileshare",
    };
  } else if (storageType === "minio") {
    config = {
      type: "s3",
      endpoint: process.env.MINIO_ENDPOINT,
      region: process.env.MINIO_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY,
        secretAccessKey: process.env.MINIO_SECRET_KEY,
      },
      forcePathStyle: true,
      bucket: process.env.MINIO_BUCKET || "shortlink-fileshare-uploads",
    };
  } else {
    config = {
      type: "local",
      uploadDir: process.env.UPLOAD_DIR || "./uploads",
    };
  }

  return new StorageService(config);
}

module.exports = createStorageService();
