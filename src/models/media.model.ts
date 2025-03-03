import mongoose from "mongoose";

export interface mediaInterface extends mongoose.Document{
    image: string[];
  video: string[];
}
const mediaSchema = new mongoose.Schema<mediaInterface>({
    image: { type: [String] },
  video: { type: [String] }
});

const media  = mongoose.model<mediaInterface>('media',mediaSchema);
export default media