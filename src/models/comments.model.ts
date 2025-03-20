import mongoose, { Schema } from "mongoose";
import { usersInterface } from "./users.model.ts";
import { postsInterface } from "./posts.model.ts";


export interface commentsInterface extends mongoose.Document{
    post_id: postsInterface;
    user_id: string;
    content: string;
    date: Date;
    media: string[];
    reacts: string[];
    tagged_users: string[];
} 

const commentsSchema = new Schema<commentsInterface>({
    post_id: { type: Schema.Types.ObjectId, ref: "posts", required: true },
    user_id: { type: String,  required: true },
    content: { type: String, required: true },
    date: { type: Date, default: Date.now },
    media: [{ type: String }],
    reacts: [{ type: String }],
    tagged_users: [{ type: String }],
});
const comments =  mongoose.model<commentsInterface>('comments', commentsSchema);

export default comments;