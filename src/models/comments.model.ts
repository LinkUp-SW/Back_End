import mongoose, { Schema } from "mongoose";
import { usersInterface } from "./users.model.ts";
import { postsInterface } from "./posts.model.ts";


export interface commentsInterface extends mongoose.Document{
    post_id: postsInterface;
    user_id: usersInterface;
    content: string;
    date: Date;
    media: string[];
    reacts: usersInterface[];
    tagged_users: usersInterface[];
} 

const commentsSchema = new Schema<commentsInterface>({
    post_id: { type: Schema.Types.ObjectId, ref: "posts", required: true },
    user_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
    content: { type: String, required: true },
    date: { type: Date, default: Date.now },
    media: [{ type: String }],
    reacts: [{ type: Schema.Types.ObjectId, ref: "users" }],
    tagged_users: [{ type: Schema.Types.ObjectId, ref: "users" }],
});
const comments =  mongoose.model<commentsInterface>('commments', commentsSchema);

export default comments;