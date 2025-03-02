import mongoose from "mongoose";

export interface mediaInterface extends mongoose.Document{
    image: string[];
  video: string[];
}
const mediaSchema = new mongoose.Schema<mediaInterface>({
    image: { type: [String], required: true },
  video: { type: [String], required: true }
});

const media  = mongoose.model<mediaInterface>('media',mediaSchema);
export default media