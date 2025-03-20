// multer.config.ts
import multer, { FileFilterCallback } from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.ts";

// 1) PDF-only file filter
const pdfFileFilter = (req: Express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (file.mimetype === "application/pdf") {
    // Accept the file
    cb(null, true);
  } else {
    // Reject the file
    cb(new Error("Only PDF files are allowed for this route."));
  }
};

// 2) Create Cloudinary storage config
const pdfStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "user_uploads/documents", 
      resource_type: "raw",
      format: "pdf", // Force pdf extension in Cloudinary
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
    };
  },
});

// 3) Create a Multer instance that uses the PDF file filter + Cloudinary storage
export const uploadPDF = multer({
  storage: pdfStorage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
  },
});
