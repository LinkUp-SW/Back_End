import mongoose, { Schema } from "mongoose";
import { postsInterface } from "../models/posts.model.ts";
import { repostsInterface } from "../models/reposts.model.ts";
import { commentsInterface } from "../models/comments.model.ts";
import { mediaInterface } from "./media.model.ts";


export interface activityInterface extends mongoose.Document{
    posts: postsInterface[];
    reposted_posts: repostsInterface[];
    reacted_posts:postsInterface[];
    comments: commentsInterface[];
    media:mediaInterface[];
}

const activitySchema = new Schema<activityInterface>({
    posts: [{ type: Schema.Types.ObjectId, ref: "posts" }],
    reposted_posts: [{ type: Schema.Types.ObjectId, ref: "reposts" }],
    reacted_posts: [{ type: Schema.Types.ObjectId, ref: "posts" }],
    comments: [{ type: Schema.Types.ObjectId, ref: "comments" }],
    media: [{ type: Schema.Types.ObjectId, ref: "media" }]
});

const activity = mongoose.model<activityInterface>('activity', activitySchema);

export default activity;