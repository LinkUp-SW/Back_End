import mongoose, { Schema } from "mongoose";
import { usersInterface } from "../models/users.model.ts";

export enum reactsEnum{
    laugh = "laugh",
    love = "heart",
    like = "thumbs up",
    cry = "cry"
}

export interface reactsInterface extends mongoose.Document{
    user_id: usersInterface;
    reacted: boolean;
}
const reactsSchema = new Schema<reactsInterface>({
    user_id: { type: Schema.Types.ObjectId, ref: "users", required:true },
    reacted: { type: Boolean, required: true }
});

const reacts = mongoose.model<reactsInterface>('reacts', reactsSchema);

export default reacts;