import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { s3 } from "../config/s3.js";

export const uploadToS3 = async (file) => {
  if (!file || !file.buffer) {
    throw new Error("Invalid file");
  }

  let fileName = "";
  let bufferToUpload = file.buffer;
  let contentType = file.mimetype;

  //  IMAGE HANDLING
  if (file.mimetype.startsWith("image/")) {
    bufferToUpload = await sharp(file.buffer)
      .rotate()
      .webp({
        quality: 60, // balanced quality + size
        effort: 4,
      })
      .toBuffer();

    fileName = `complaints/images/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.webp`;

    contentType = "image/webp";
  }

  //  VIDEO HANDLING (no compression here)
  else if (file.mimetype.startsWith("video/")) {
    fileName = `complaints/videos/${Date.now()}-${file.originalname}`;
  }

  //  UNSUPPORTED FILE
  else {
    throw new Error("Only image and video files are allowed");
  }

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: bufferToUpload,
    ContentType: contentType,
  };

  await s3.send(new PutObjectCommand(params));

  return {
    url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`,
    key: fileName,
  };
};

// 🔥 Delete file from S3
export const deleteFromS3 = async (key) => {
  if (!key) return;

  await s3.send(
    new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    })
  );
};