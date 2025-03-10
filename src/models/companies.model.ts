import mongoose, { Schema } from "mongoose";
import { postsInterface } from "./posts.model.ts";
import { clientsInterface } from "./clients.model.ts";
import { conversationsInterface } from "./conversations.model.ts";


export enum companySizeEnum {
    small_0_1 = "0 - 1 employees",
    small_2_10 = "2-10 employees",
    small_11_50 = "11-50 employees",
    medium_51_200 = "51-200 employees",
    medium_201_500 = "201-500 employees",
    large_501_1000 = "501-1,000 employees",
    large_1001_5000 = "1,001-5,000 employees",
    large_5001_10000 = "5,001-10,000 employees",
    enterprise_10000_plus = "10,000+ employees",
  }
export enum companyTypeEnum{
    public_company = "Public company",
    self_employed = "Self-employed",
    government_agency = "Government agency",
    nonprofit = "Nonprofit",
    sole_proprietorship = "Sole proprietorship",
    privately_held = "Privately held",
    partnership = "Partnership"
}
  
export interface companiesInterface extends mongoose.Document{
    company_name: string;
    unique_url: string;
    website: string;
    logo: string;
    description: string;
    industry: string;
    location: string;
    size: companySizeEnum;
    type: companyTypeEnum;
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
    size: { type: String, enum: Object.values(companySizeEnum), required: true },
    type: { type: String, enum: Object.values(companyTypeEnum), required: true },
    posts: [{ type: Schema.Types.ObjectId, ref: "posts" }],
    followers: [{ type: Schema.Types.ObjectId, ref: "clients" }],
    blocked: [{ type: Schema.Types.ObjectId, ref: "clients" }],
    conversations: [{ type: Schema.Types.ObjectId, ref: "conversations" }]
});

const companies = mongoose.model<companiesInterface>('companies', companiesSchema);

export default companies;