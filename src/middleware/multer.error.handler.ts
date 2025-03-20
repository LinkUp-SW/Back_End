import { Request, Response, NextFunction } from "express";
import { MulterError } from "multer";
import { uploadImages } from "../../config/multer.images.ts";
import { uploadPDF } from "../../config/multer.pdf.ts";



// Middleware to handle Multer errors
export const multerImageErrorHandler = (fieldName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      uploadImages.single(fieldName)(req, res, (err: any) => {
        if (err) {
          // Check if it's a Multer file size limit error
          if (err instanceof MulterError && err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "File too large. Maximum size is 2MB." });
          }
          // Otherwise, handle any other Multer or custom errors
          return res.status(400).json({ message: err.message });
        }
        // No errors, proceed to the next middleware or controller
        next();
      });
    };
  };


// Middleware to handle Multer errors for PDF uploads
export const multerPDFErrorHandler = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    uploadPDF.single(fieldName)(req, res, (err: any) => {
      if (err) {
        // Handle Multer-specific errors
        if (err instanceof MulterError && err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File too large. Maximum size is 2MB." });
        }
        // Handle other errors (e.g., invalid file type)
        return res.status(400).json({ message: err.message });
      }
      // No errors, proceed to the next middleware or controller
      next();
    });
  };
};