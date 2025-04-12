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
export enum mediaTypeEnum{
    image = "image",
    images = "images",
    video = "video",
    pdf = "pdf",
    post = "post",
    link = "link",
    none = "none"
}
export interface postsInterface extends mongoose.Document{
    user_id: string;
    content: string;
    date: Date;
    media: {
        link:string[],
        media_type:string
    };
    comments_disabled: commentsEnum;
    public_post: Boolean;
    reacts: {
        user_id:usersInterface,
        react:string
    }[];
    tagged_users: usersInterface[];
    comments: commentsInterface[];
}

const postsSchema = new Schema<postsInterface>({
    user_id: { type: String },
    content: { type: String },
    date: { type: Date, default: Date.now },
    media: { 
        link:[{type: String}],
        media_type: {type: String}
     },
    comments_disabled: { type: String, enum: Object.values(commentsEnum) },
    public_post: { type: Boolean, default: true },
    reacts: [{ 
        user_id:{ type: Schema.Types.ObjectId, ref: "users"},
        react:{ type: String }
     }],
    tagged_users: [{ type: Schema.Types.ObjectId, ref: "users" }],
    comments: [{ type: Schema.Types.ObjectId, ref: "comments" }],
});

const posts = mongoose.model<postsInterface>('posts', postsSchema);

export default posts;