import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { s3 } from "../config/s3.js";


export const uploadToS3 = async (file) => {
  //  Validate image
  if (!file.mimetype.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }


  //  Compress WITHOUT resizing
  const processedBuffer = await sharp(file.buffer)
    .rotate() // fixes orientation
    .webp({
      quality: 50, 
      effort: 4,  
    })
    .toBuffer();

  //  Clean filename + convert to .webp
  const fileName = `complaints/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.webp`;

  const params = {
    Bucket:process.env.AWS_BUCKET_NAME, 
    Key:fileName,
    Body:processedBuffer,
    ContentType: "image/webp", 
  };

  await s3.send(new PutObjectCommand(params));

  return {
    url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`,
    key: fileName,
  };
};

// 🔥 Optional (VERY useful later)
export const deleteFromS3 = async (key) => {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    })
  );
};