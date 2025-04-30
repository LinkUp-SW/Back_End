import mongoose, { Schema } from "mongoose";
import { usersInterface } from "./users.model.ts";
import { commentsInterface } from "./comments.model.ts";
import { reactsInterface } from "./reactions.model.ts";


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

export enum postTypeEnum {
    standard = "Standard",
    repost_thought = "Repost thought",
    repost_instant = "Repost instant"
}

export interface postsInterface extends mongoose.Document {
    user_id: string;
    content: string;
    date: number; 
    media: {
        link: string[],
        media_type: string
    };
    comments_disabled: commentsEnum;
    public_post: Boolean;
    reacts: reactsInterface[];
    tagged_users: string[];
    comments: commentsInterface[];
    isEdited:boolean;
    
    // Fields to support reposts
    post_type: postTypeEnum;
    reposts?: postsInterface[]
}

const postsSchema = new Schema<postsInterface>({
    user_id: { type: String },
    content: { type: String },
    date: { 
        type: Number, 
        default: () => Math.floor(Date.now() / 1000)
    },
    media: { 
        link: [{ type: String }],
        media_type: { type: String }
    },
    comments_disabled: { type: String, enum: Object.values(commentsEnum) },
    public_post: { type: Boolean, default: true },
    reacts: [{ type: Schema.Types.ObjectId, ref: "reacts" }],
    tagged_users: [{ type: String }],
    comments: [{ type: Schema.Types.ObjectId, ref: "comments" }],
    isEdited: { type: Boolean, default: false },
    
    // New fields for combined schema
    post_type: { 
        type: String, 
        enum: Object.values(postTypeEnum), 
        default: postTypeEnum.standard 
    },
    reposts: [{ type: Schema.Types.ObjectId, ref: 'posts' }]
});

const posts = mongoose.model<postsInterface>('posts', postsSchema);

export default posts;