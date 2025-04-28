import mongoose, { Schema } from "mongoose";
import { usersInterface } from "./users.model.ts";

export interface MessageInterface {
    sender_id: string;
    messageId: string;
    message: string;
    media: string[]; 
    timestamp: Date;
    reacted: string;
    is_seen: boolean;
    media_type?: string[]; // For identifying type of media (image, video, document)
    typing?: boolean;
}

export enum conversationType {
    jobs = "Jobs",
    myConnections = "My Connections",
    inMail = "InMail",
    starred = "Starred",
    unRead = "Unread",
}

export interface conversationsInterface extends mongoose.Document {
    _id: string;
    user1_id: string;
    user2_id: string;
    user1_sent_messages: MessageInterface[];
    user2_sent_messages: MessageInterface[];
    last_message_time: Date;
    last_message_text: string;
    unread_count_user1: number;
    unread_count_user2: number;
    is_blocked_by_user1: boolean;
    is_blocked_by_user2: boolean;
    user1_conversation_type: string[];
    user2_conversation_type: string[];
}

const MessageSchema = new Schema({
    sender_id: { type: String },
    messageId: { type: String },
    message: { type: String },
    media: [{ type: String }],
    media_type: [{ type: String }],
    timestamp: { type: Date, default: Date.now },
    reacted: { type: String, default: false },
    is_seen: { type: Boolean, default: false },
});

const conversationsSchema = new Schema<conversationsInterface>({
    user1_id: { type: String },
    user2_id: { type: String },
    user1_sent_messages: [MessageSchema],
    user2_sent_messages: [MessageSchema],
    last_message_time: { type: Date, default: Date.now },
    last_message_text: { type: String, default: "" },
    unread_count_user1: { type: Number, default: 0 },
    unread_count_user2: { type: Number, default: 0 },
    is_blocked_by_user1: { type: Boolean, default: false },
    is_blocked_by_user2: { type: Boolean, default: false },
    user1_conversation_type : { type: [String], enum: Object.values(conversationType), default: [conversationType.unRead] },
    user2_conversation_type : { type: [String], enum: Object.values(conversationType), default: [conversationType.unRead] },
});

const conversations = mongoose.model<conversationsInterface>('conversations', conversationsSchema);

export default conversations;