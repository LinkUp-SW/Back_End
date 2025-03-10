import mongoose, { Schema } from "mongoose";
import { usersInterface } from "./users.model.ts";
import { postsInterface } from "./posts.model.ts";


export interface repostsInterface extends mongoose.Document{
    post_id: postsInterface;
    user_id: usersInterface;
    content: string;
}

const repostsSchema = new Schema<repostsInterface>({
    post_id: { type: Schema.Types.ObjectId, ref: "posts", required:true },
    user_id: { type: Schema.Types.ObjectId, ref: "users", required:true },
    content: { type: String}
});

const reposts = mongoose.model<repostsInterface>('reposts', repostsSchema);

export default reposts;