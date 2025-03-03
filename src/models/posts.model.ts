import mongoose, { Schema } from "mongoose";
import { mediaInterface } from "./media.model";
import { usersInterface } from "./users.model";
import { commentsInterface } from "./comments.model";
import { reactsInterface } from "./reactions.model";


export interface postsInterface extends mongoose.Document{
    user_id: string;
    content: string;
    date: Date;
    media: mediaInterface;
    comments_disabled: Enumerator;
    visibility: Boolean;
    reacts:reactsInterface[];
    tagged_users: usersInterface[];
    comments:commentsInterface[];
}

const postsSchema = new Schema<postsInterface>({
    user_id: { type: String, required: true },
    content: { type: String, required: true },
    date: { type: Date, default: Date.now},
    media: { type: Schema.Types.ObjectId, ref: "media" },
    comments_disabled: { type: Enumerator},
    visibility: { type: Boolean, default: true },
    reacts: [{ type: Schema.Types.ObjectId, ref: "reacts" },],
    tagged_users: [{ type: Schema.Types.ObjectId, ref: "users" }],
    comments: [{ type: Schema.Types.ObjectId, ref: "comments" }]
});

const posts = mongoose.model<postsInterface>('posts', postsSchema);

export default posts;