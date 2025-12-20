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
      console.error("Multer error during upload:", err);
      return res
        .status(400)
        .json({ error: "File upload error", details: err.message });
    } else if (err) {
      console.error("An unknown error occurred during the upload process", err);
      return res.status(500).json({ error: "An unknown error occurred" });
    }
    try {
      const file = req.file;
      if (!file) {
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

      const fileRecord = await File.create({
        originalName: file.originalname,
        storedName: shortlink + path.extname(file.originalname),
        shortlink: shortlink,
        filePath: filepath,
        mimeType: file.mimetype,
        fileSize: file.size,
        userId: req.user.id,
      });

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
      console.error("Upload error:", error);
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
    console.error("Error fetching files:", error);
    res.status(500).json({ error: "Error fetching files" });
  }
});

router.get("/:shortlink", async (req, res) => {
  try {
    const { shortlink } = req.params;

    const file = await File.findOne({ where: { shortlink } });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const storageResponse = await storage.getFile(file);

    res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${file.storedName}"`
    );
    res.setHeader("Content-Length", file.fileSize);

    storageResponse.stream.pipe(res);
  } catch (error) {
    console.error("Error serving file:", error);
    res.status(500).json({ error: "Error serving file" });
  }
});

router.delete("/:shortlink", async (req, res) => {
  try {
    const { shortlink } = req.params;

    const file = await File.findOne({ where: { shortlink } });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }
    if (file.userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await storage.deleteFile(file);

    await file.destroy();

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Error deleting file" });
  }
});

module.exports = router;
