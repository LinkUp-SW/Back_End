import mongoose, { Schema } from "mongoose";
import { messagesInterface } from "./messages.model";


export interface conversationsInterface extends mongoose.Document{
    user1_id: string;
    user2_id: string;
    user1_sent_messages: messagesInterface[];
    user2_sent_messages: messagesInterface[];
}

const conversationsSchema = new Schema({
    user1_id: { type: String, required: true },
    user2_id: { type: String, required: true },
    user1_sent_messages: [{ type: Schema.Types.ObjectId, ref: 'message' }],
    user2_sent_messages: [{ type: Schema.Types.ObjectId, ref: 'message' }]
});

const conversations = mongoose.model<conversationsInterface>('conversations', conversationsSchema);

export default conversations;

