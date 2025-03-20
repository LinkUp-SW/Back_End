import mongoose, { Schema } from "mongoose";
import { messagesInterface } from "../models_to_delete/messages.model.ts";
import { usersInterface } from "./users.model.ts";


export interface conversationsInterface extends mongoose.Document{
    user1_id: usersInterface;
    user2_id: usersInterface;
    user1_sent_messages: {
        message: string;
        media: string[]; 
        timestamp: Date;
        reacted: boolean;
        is_seen: boolean;
    }[];
    user2_sent_messages:{
        message: string;
        media: string[]; 
        timestamp: Date;
        reacted: boolean;
        is_seen: boolean;
    }[];
}

const conversationsSchema = new Schema<conversationsInterface>({
    user1_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
    user2_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
    user1_sent_messages: [
        {
            message: { type: String },
            media: [{ type: String }],
            timestamp: { type: Date, default: Date.now },
            reacted: { type: Boolean, default: false },
            is_seen: { type: Boolean, default: false },
        },
    ],
    user2_sent_messages: [
        {
            message: { type: String },
            media: [{ type: String }],
            timestamp: { type: Date, default: Date.now },
            reacted: { type: Boolean, default: false },
            is_seen: { type: Boolean, default: false },
        },
    ],
});

const conversations = mongoose.model<conversationsInterface>('conversations', conversationsSchema);

export default conversations;

