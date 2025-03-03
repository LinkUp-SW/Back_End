import mongoose, { Schema } from "mongoose";
import { usersInterface } from "./users.model";
import { mediaInterface } from "./media.model";
import { reactsInterface } from "./reactions.model";


export interface commentsInterface extends mongoose.Document{
    post_id: string;
    user_id: string;
    content: string;
    date: Date;
    media: mediaInterface;
    reacts:reactsInterface[];
    tagged_users: usersInterface[];
} 

const commentsSchema = new Schema({
    post_id: { type: String, required: true },
    user_id: { type: String, required: true },
    content: { type: String, required: true },
    date: { type: Date, default: Date.now },
    media: { type: Schema.Types.ObjectId, ref: "media" },
    reacts: [{ type: Schema.Types.ObjectId, ref: "reacts" }],
    tagged_users: [{ type: Schema.Types.ObjectId, ref: "users" }]
});

const comments =  mongoose.model<commentsInterface>('commments', commentsSchema);

export default comments;