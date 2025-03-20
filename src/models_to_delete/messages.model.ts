import mongoose, { Schema } from "mongoose";
import { mediaInterface } from "../models_to_delete/media.model.ts";
import { reactsEnum } from "./reactions.model.ts";



export interface messagesInterface extends mongoose.Document{
    content: {
        message: string;
        media: mediaInterface;
    }[];
    timestamp: Date;
    is_seen: boolean;
    reactions: reactsEnum[];
}

const messagesSchema = new Schema<messagesInterface>({
    content: [{
        message: { type: String},
        media: { type: Schema.Types.ObjectId, ref: "media" }
    }],
    timestamp: { type: Date, default: Date.now },
    is_seen: { type: Boolean, required: true},
    reactions: [{ type: String, enum: Object.values(reactsEnum)}]
});

const messages = mongoose.model<messagesInterface>('messages', messagesSchema);

export default messages;