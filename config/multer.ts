import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.ts"; 

// Configure Multer Storage with Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = "user_uploads"; // default folder
    let resource_type = "image"; // default resource type
    let format = undefined;

    // Determine folder and resource type based on MIME type
    if (file.mimetype.startsWith("image/")) {
      folder = "user_uploads/images";
    } else if (file.mimetype.startsWith("video/")) {
      folder = "user_uploads/videos";
      resource_type = "video";
    } else if (
      file.mimetype === "application/pdf" ||
      file.mimetype.startsWith("application/")
    ) {
      folder = "user_uploads/documents";
      resource_type = "raw";
      if (file.mimetype === "application/pdf") {
        format = "pdf";
      }
    }

    return {
      folder,
      format,
      resource_type,
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`
    };
  }
});

const upload = multer({ storage });
export default upload;
