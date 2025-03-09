import mongoose, { Schema } from "mongoose";
import { usersInterface } from "./users.model";

export enum reactsEnum{
    laugh = "laugh",
    love = "heart",
    like = "thumbs up",
    cry = "cry"
}

export interface reactsInterface extends mongoose.Document{
    user_id: usersInterface;
    reaction: reactsEnum;
}
const reactsSchema = new Schema<reactsInterface>({
    user_id: { type: Schema.Types.ObjectId, ref: "users", required:true },
    reaction: { type: String, enum: Object.values(reactsEnum), required: true }
});

const reacts = mongoose.model<reactsInterface>('reacts', reactsSchema);

export default reacts;