import mongoose, { Schema } from "mongoose";
import { usersInterface } from "./users.model.ts";
import { postsInterface } from "./posts.model.ts";


export interface commentsInterface extends mongoose.Document{
    post_id: postsInterface;
    parentId:commentsInterface;
    user_id: usersInterface;
    content: string;
    date: Date;
    media: string;
    reacts: string[];
    tagged_users: string[];
    is_edited:boolean;
} 

const commentsSchema = new Schema<commentsInterface>({
    post_id: { type: Schema.Types.ObjectId, ref: "posts"},
    parentId:{type: Schema.Types.ObjectId, ref: "comments"},
    user_id: {type: Schema.Types.ObjectId, ref: "users"},
    content: { type: String},
    date: { type: Date, default: Date.now },
    media: { type: String },
    reacts: [{ type: String }],
    tagged_users: [{ type: String }],
    is_edited:{type:Boolean, default:false}
});
const comments =  mongoose.model<commentsInterface>('comments', commentsSchema);

export default comments;