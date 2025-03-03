import mongoose, { Schema } from "mongoose";


export interface reactsInterface extends mongoose.Document{
    user_id: string;
    reaction: Enumerator;
}
const reactsSchema = new Schema<reactsInterface>({
    user_id: { type: String, required: true },
    reaction: { type: String, required: true }
});

const reacts = mongoose.model<reactsInterface>('reacts', reactsSchema);

export default reacts;