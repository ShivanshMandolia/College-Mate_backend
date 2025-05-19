import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const ext = path.extname(localFilePath).toLowerCase();

    // Determine resource type based on file extension
    const isImage = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"].includes(ext);
    const resourceType = isImage ? "image" : "raw";

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: resourceType,
    });

    fs.unlinkSync(localFilePath); // Clean up after upload
    return response;

  } catch (error) {
    console.error("Cloudinary upload error:", error.message);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

export { uploadOnCloudinary };
