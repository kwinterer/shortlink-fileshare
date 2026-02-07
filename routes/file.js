const express = require("express");
const path = require("path");
const fs = require("fs");
const { File } = require("../models");
const router = express.Router();
const { ensureAuth } = require("../middleware/auth");

const multer = require("multer");
const { customAlphabet } = require("nanoid");
const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet, 8);

const storage = require("../services/storage");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: (process.env.MAX_FILE_SIZE_MB || 50) * 1024 * 1024 }, //MB to bytes
});

router.post("/upload", ensureAuth, async (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      req.log.error({body: req.body, user: req.user, error: err}, `Multer error during upload: ${err}`);
      return res
        .status(400)
        .json({ error: "File upload error", details: err.message });
    } else if (err) {
      req.log.error({body: req.body, user: req.user, error: err}, `An unknown error occurred during the upload process: ${err}`);
      return res.status(500).json({ error: "An unknown error occurred" });
    }
    try {
      const file = req.file;
      req.log.info({body: req.body, user: req.user,
                    file: {originalName: file.originalname,mimeType: file.mimetype,fileSize: file.size,userId: req.user.id}, 
                   }, `Got /file/upload request with user id ${req.user.id}`);
      if (!file) {
        req.log.warn({body: req.body, user: req.user, 
                      file: {originalName: file.originalname,mimeType: file.mimetype,fileSize: file.size,userId: req.user.id},
                    }, `No file uploaded by user id ${user.id}`);
        return res.status(400).json({ error: "No file uploaded" });
      }
      let shortlink;
      let isUnique = false;
      while (!isUnique) {
        shortlink = nanoid();
        const existing = await File.findOne({ where: { shortlink } });
        if (!existing) {
          isUnique = true;
        }
      }

      const filepath = await storage.uploadFile(file, shortlink);
      
      req.log.info({body: req.body, 
                    user: req.user, 
                    file: {originalName: file.originalname,storedName: shortlink + path.extname(file.originalname),shortlink: shortlink,filePath: filepath,mimeType: file.mimetype,fileSize: file.size,userId: req.user.id}, 
                    filepath:filepath }, 
                    `File uploaded to storage: ${filepath}`);

      const fileRecord = await File.create({
        originalName: file.originalname,
        storedName: shortlink + path.extname(file.originalname),
        shortlink: shortlink,
        filePath: filepath,
        mimeType: file.mimetype,
        fileSize: file.size,
        userId: req.user.id,
      });

      req.log.info({body: req.body, user: req.user, file: fileRecord, filepath:filepath }, `File record created in database with id: ${file.id}`);

      res.status(201).json({
        success: true,
        message: "File uploaded successfully",
        file: {
          originalName: fileRecord.originalName,
          shortlink: fileRecord.shortlink,
          accessUrl: `${req.protocol}://${req.get("host")}/file/${
            fileRecord.shortlink
          }`,
          fileSize: fileRecord.fileSize,
          uploadedAt: fileRecord.createdAt,
        },
      });
    } catch (error) {
      req.log.error({body: req.body, user: req.user, 
                     file: {originalName: req.file.originalname,mimeType: req.file.mimetype,fileSize: req.file.size,userId: req.user.id},  
                     error: error}, `Upload error: ${error}`);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res
        .status(500)
        .json({ error: "Error uploading file", details: error.message });
    }
  });
});

router.get("/files", ensureAuth, async (req, res) => {
  try {
    const files = await File.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "originalName",
        "shortlink",
        "fileSize",
        "mimeType",
        "createdAt",
      ],
    });
    const filesWithUrls = files.map((file) => ({
      ...file.toJSON(),
      accessUrl: `${req.protocol}://${req.get("host")}/file/${file.shortlink}`,
    }));

    res.json({
      success: true,
      count: files.length,
      files: filesWithUrls,
    });
  } catch (error) {
    req.log.error({body: req.body, user: req.user, error: error}, `Error fetching files: ${error}`);
    res.status(500).json({ error: "Error fetching files" });
  }
});

router.get("/:shortlink", async (req, res) => {
  try {
    const { shortlink } = req.params;

    const file = await File.findOne({ where: { shortlink } });

    if (!file) {
      req.log.warn({body: req.body, user: req.user, shortlink: shortlink, file: file}, `No file ${shortlink} found`);
      return res.status(404).json({ error: "File not found" });
    }

    req.log.info({body: req.body, user: req.user, shortlink: shortlink, file: file}, `File record for ${shortlink} found`);
    const storageResponse = await storage.getFile(file);
    req.log.info({body: req.body, user: req.user, shortlink: shortlink, file: file, storageResponse: storageResponse}, `File retrieved from storage`);
    res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${file.storedName}"`
    );
    res.setHeader("Content-Length", file.fileSize);

    storageResponse.stream.pipe(res);
  } catch (error) {
    req.log.error({body: req.body, user: req.user, shortlink: req.params.shortlink, error: error}, `Error serving file: ${error}`);
    res.status(500).json({ error: "Error serving file" });
  }
});

router.delete("/:shortlink", async (req, res) => {
  try {
    const { shortlink } = req.params;

    const file = await File.findOne({ where: { shortlink } });

    if (!file) {
      req.log.warn({body: req.body, user: req.user, shortlink: shortlink}, `No file ${shortlink} found`);
      return res.status(404).json({ error: "File not found" });
    }
    if (file.userId !== req.user.id) {
      req.log.warn({body: req.body, user: req.user, shortlink: shortlink}, `User ${req.user.id} forbiden from deleting file ${shortlink}`);
      return res.status(403).json({ error: "Forbidden" });
    }
    await storage.deleteFile(file);
    req.log.info({body: req.body, user: req.user, shortlink: shortlink, file: file}, `File ${shortlink} deleting in storage`);
    await file.destroy();
    req.log.info({body: req.body, user: req.user, shortlink: shortlink, file: file}, `File ${shortlink} deleting in database`);
    res.json({ success: true });
  } catch (error) {
    req.log.error({body: req.body, user: req.user, shortlink: req.params.shortlink, error: error}, `Error deleting file: ${error}`);
    res.status(500).json({ error: "Error deleting file" });
  }
});

module.exports = router;
