import mongoose, { Schema } from "mongoose";
import { mediaInterface } from "./media.model";
import { usersInterface } from "./users.model";
import { commentsInterface } from "./comments.model";
import { reactsInterface } from "./reactions.model";


export enum commentsEnum{
    anyone = "Anyone",
    connections_only = "Connections only",
    noone = "No one"
}

export interface postsInterface extends mongoose.Document{
    user_id: usersInterface;
    content: string;
    date: Date;
    media: mediaInterface;
    comments_disabled: commentsEnum;
    visibility: Boolean;
    reacts:reactsInterface[];
    tagged_users: usersInterface[];
    comments:commentsInterface[];
}

const postsSchema = new Schema<postsInterface>({
    user_id: { type: Schema.Types.ObjectId, ref: "users", required:true },
    content: { type: String, required: true },
    date: { type: Date, default: Date.now},
    media: { type: Schema.Types.ObjectId, ref: "media" },
    comments_disabled: { type: String, enum: Object.values(commentsEnum), required: true },
    visibility: { type: Boolean, default: true },
    reacts: [{ type: Schema.Types.ObjectId, ref: "reacts" },],
    tagged_users: [{ type: Schema.Types.ObjectId, ref: "users" }],
    comments: [{ type: Schema.Types.ObjectId, ref: "comments" }]
});

const posts = mongoose.model<postsInterface>('posts', postsSchema);

export default posts;