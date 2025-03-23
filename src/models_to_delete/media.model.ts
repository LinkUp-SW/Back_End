import mongoose from "mongoose";
import validator from "validator";

export interface mediaInterface extends mongoose.Document {
    image: string[];
    video: string[];
}

const mediaSchema = new mongoose.Schema<mediaInterface>({
  image: { 
      type: [String], 
      required: true,
      validate: {
          validator: (arr: string[]) => Array.isArray(arr) && arr.every(item => typeof item === "string" && validator.isURL(item)),
          message: "All image values must be valid URLs"
      }
  },
  video: { 
      type: [String], 
      required: true,
      validate: {
          validator: (arr: string[]) => Array.isArray(arr) && arr.every(item => typeof item === "string" && validator.isURL(item)),
          message: "All video values must be valid URLs"
      }
  }
});

const media = mongoose.model<mediaInterface>("media", mediaSchema);
export default media;
