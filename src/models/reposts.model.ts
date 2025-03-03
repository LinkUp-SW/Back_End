import mongoose, { Schema } from "mongoose";


export interface repostsInterface extends mongoose.Document{
    post_id: string;
    user_id: string;
    content: string;
}

const repostsSchema = new Schema<repostsInterface>({
    post_id: { type: String, required: true },
    user_id: { type: String, required: true },
    content: { type: String}
});

const reposts = mongoose.model<repostsInterface>('reposts', repostsSchema);

export default reposts;