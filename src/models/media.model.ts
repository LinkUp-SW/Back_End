import mongoose from "mongoose";

export interface mediaInterface extends mongoose.Document {
    image: unknown[];
    video: unknown[];
}

const mediaSchema = new mongoose.Schema<mediaInterface>({
  image: { 
      type: [mongoose.Schema.Types.Mixed], 
      required: true,
      validate: {
          validator: (arr: unknown[]) => Array.isArray(arr) && arr.every(item => typeof item === "string"),
          message: "All image values must be strings"
      }
  },
  video: { 
      type: [mongoose.Schema.Types.Mixed], 
      required: true,
      validate: {
          validator: (arr: unknown[]) => Array.isArray(arr) && arr.every(item => typeof item === "string"),
          message: "All video values must be strings"
      }
  }
});

const media = mongoose.model<mediaInterface>("media", mediaSchema);
export default media;
