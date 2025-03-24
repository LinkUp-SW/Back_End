import mongoose, { Schema } from "mongoose";
import { mediaInterface } from "../models_to_delete/media.model.ts";
import { usersInterface } from "./users.model.ts";
import { commentsInterface } from "./comments.model.ts";
import { reactsInterface } from "../models_to_delete/reactions.model.ts";


export enum commentsEnum{
    anyone = "Anyone",
    connections_only = "Connections only",
    noone = "No one"
}

export interface postsInterface extends mongoose.Document{
    user_id: string;
    content: string;
    date: Date;
    media: string[];
    comments_disabled: commentsEnum;
    visibility: Boolean;
    reacts: usersInterface[];
    tagged_users: usersInterface[];
    comments: commentsInterface[];
}

const postsSchema = new Schema<postsInterface>({
    user_id: { type: String },
    content: { type: String },
    date: { type: Date, default: Date.now },
    media: [{ type: String }],
    comments_disabled: { type: String, enum: Object.values(commentsEnum) },
    visibility: { type: Boolean, default: true },
    reacts: [{ type: String }],
    tagged_users: [{ type: String }],
    comments: [{ type: Schema.Types.ObjectId, ref: "comments" }],
});

const posts = mongoose.model<postsInterface>('posts', postsSchema);

export default posts;