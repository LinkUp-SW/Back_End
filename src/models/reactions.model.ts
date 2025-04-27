import mongoose, { ObjectId, Schema } from "mongoose";
import { usersInterface } from "../models/users.model.ts";
import { postsInterface } from "./posts.model.ts";
import { commentsInterface } from "./comments.model.ts";

export enum reactsEnum{
    like = "like",
    celebrate = "celebrate",
    support = "support",
    love = "love",
    insightful="insightful",
    funny = "funny"
}
export enum targetTypeEnum {
    post = "Post",
    comment = "Comment"
}
export interface reactsInterface extends mongoose.Document{
    user_id: usersInterface;
    target_id: ObjectId //post or comment Id
    target_type: targetTypeEnum;
    reaction: reactsEnum;
}
const reactsSchema = new Schema<reactsInterface>({
    user_id: { type: Schema.Types.ObjectId, ref: "users"},
    target_id:{ type: Schema.Types.ObjectId},
    target_type:{ type: String, enum: Object.values(targetTypeEnum)},
    reaction:{ type: String, enum: Object.values(reactsEnum)}
}, { timestamps:{
    createdAt:true,
    updatedAt:false
}});
reactsSchema.index({ user_id: 1, target_id: 1 }, { unique: true });
const reacts = mongoose.model<reactsInterface>('reacts', reactsSchema);

export default reacts;