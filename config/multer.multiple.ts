import multer, { FileFilterCallback } from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.ts"; // adjust the path as needed
import path from "path";

// Custom Cloudinary storage configuration for multiple fields
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    if (file.fieldname === "images") {
      return {
        folder: "user_uploads/images",
        resource_type: "image",
        public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
      };
    } else if (file.fieldname === "pdf") {
      return {
        folder: "user_uploads/documents",
        resource_type: "raw",
        format: "pdf",
        public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
      };
    }
    // If the field is not recognized, throw an error.
    throw new Error("Unexpected field");
  },
});

// Custom file filter for validating images and pdfs
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (file.fieldname === "images") {
    // Validate images
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (file.mimetype.startsWith("image/") && allowedExtensions.includes(fileExt)) {
      return cb(null, true);
    }
    return cb(
      new Error("Only image files are allowed. Valid extensions: .jpg, .jpeg, .png, .webp")
    );
  } else if (file.fieldname === "pdf") {
    // Validate PDF files
    if (file.mimetype === "application/pdf") {
      return cb(null, true);
    }
    return cb(new Error("Only PDF files are allowed in the pdf field."));
  }
  return cb(new Error("Unexpected field"));
};

// Create a single Multer instance handling both fields
export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB limit per file
}).fields([
  { name: "images", maxCount: 5 },
  { name: "pdf", maxCount: 1 },
]);