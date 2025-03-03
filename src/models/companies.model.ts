import mongoose, { Schema } from "mongoose";
import { postsInterface } from "./posts.model";
import { clientsInterface } from "./clients.model";
import { conversationsInterface } from "./conversations.model";


export interface companiesInterface extends mongoose.Document{
    company_name: string;
    unique_url: string;
    website: string;
    logo: string;
    description: string;
    industry: string;
    location: string;
    size: Enumerator;
    type: Enumerator;
    posts: postsInterface[];
    followers: clientsInterface[];
    blocked: clientsInterface[];
    conversations: conversationsInterface[];
}

const companiesSchema = new Schema<companiesInterface>({
    company_name: { type: String, required: true },
    unique_url: { type: String, required: true },
    website: { type: String},
    logo: { type: String},
    description: { type: String},
    industry: { type: String, required: true },
    location: { type: String},
    size: { type: Enumerator, required: true },
    type: { type: Enumerator, required: true },
    posts: [{ type: Schema.Types.ObjectId, ref: "posts" }],
    followers: [{ type: Schema.Types.ObjectId, ref: "clients" }],
    blocked: [{ type: Schema.Types.ObjectId, ref: "clients" }],
    conversations: [{ type: Schema.Types.ObjectId, ref: "conversations" }]
});

const companies = mongoose.model<companiesInterface>('companies', companiesSchema);

export default companies;