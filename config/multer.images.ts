import multer, { FileFilterCallback } from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.ts";
import path from "path";

const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

/**
 * Validates that the uploaded file is an image by:
 * 1. Checking if MIME type starts with "image/".
 * 2. Checking if the file extension is in the allowed list.
 */
const imageFileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  // Get the file extension in lowercase (e.g., ".jpg")
  const fileExt = path.extname(file.originalname).toLowerCase();

  // Check the MIME type and file extension
  if (file.mimetype.startsWith("image/") && allowedExtensions.includes(fileExt)) {
    return cb(null, true);
  }

  // If it doesn't match, reject the file
  cb(new Error("Only image files are allowed. Valid extensions: .jpg, .jpeg, .png, .gif, .webp"));
};

const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "user_uploads/images",
      resource_type: "image",
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
    };
  },
});

export const uploadImages = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
  },
});
