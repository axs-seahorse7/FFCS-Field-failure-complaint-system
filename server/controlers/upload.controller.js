import { drive } from "../config/drive.js";

export const uploadImageToDrive = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    console.log("Uploading file to Drive:", req.file.originalname, "size:", req.file.size);
    const fileMetadata = {
      name: Date.now() + "-" + req.file.originalname,
      parents: [process.env.DRIVE_FOLDER_ID],
    };

    const media = {
      mimeType: req.file.mimetype,
      body: Buffer.from(req.file.buffer),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id",
    });

    // Make file public
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    const imageUrl = `https://drive.google.com/uc?id=${file.data.id}`;

    res.json({
      fileId: file.data.id,
      url: imageUrl,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Upload failed" });
  }
};