import mongoose, { Schema } from "mongoose";
import { usersInterface } from "./users.model.ts";
import { postsInterface } from "./posts.model.ts";
import { reactsInterface } from "./reactions.model.ts";


export interface commentsInterface extends mongoose.Document{
    post_id: postsInterface;
    parentId:commentsInterface;
    user_id: usersInterface;
    content: string;
   date: number; // Changed to number type for Unix timestamp
    media: string;
    reacts: reactsInterface[];
    tagged_users: string[];
    is_edited:boolean;
} 

const commentsSchema = new Schema<commentsInterface>({
    post_id: { type: Schema.Types.ObjectId, ref: "posts"},
    parentId:{type: Schema.Types.ObjectId, ref: "comments"},
    user_id: {type: Schema.Types.ObjectId, ref: "users"},
    content: { type: String},
    date: { 
        type: Number, 
        default: () => Math.floor(Date.now() / 1000) // Unix timestamp in seconds
    },
    media: { type: String },
   reacts: [{ type: Schema.Types.ObjectId, ref: "reacts" }],
    tagged_users: [{ type: String }],
    is_edited:{type:Boolean, default:false}
});
const comments =  mongoose.model<commentsInterface>('comments', commentsSchema);

export default comments;