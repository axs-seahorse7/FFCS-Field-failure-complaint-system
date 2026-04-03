import sharp from "sharp";

export const processImage = async (buffer) => {
  return await sharp(buffer)
    .rotate() // keeps orientation correct (safe)
    .webp({ 
      quality: 70,        // 🔥 compression level
      effort: 4           // 0–6 (higher = better compression, slower)
    })
    .toBuffer();
};