import mongoose, { Schema } from "mongoose";
import { postsInterface } from "./posts.model.ts";
import { usersInterface } from "./users.model.ts";
import { conversationsInterface } from "./conversations.model.ts";


export enum organizationSizeEnum {
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
export enum organizationTypeEnum{
    public_organization = "Public organization",
    self_employed = "Self-employed",
    government_agency = "Government agency",
    nonprofit = "Nonprofit",
    sole_proprietorship = "Sole proprietorship",
    privately_held = "Privately held",
    partnership = "Partnership"
}

export enum categoryTypeEnum{
    company = "company",
    education = "education"
}

export enum adminLevelEnum{
    super_admin = "Super admin",
    content_admin = "Content admin",
    analyst = "Analyst"
}
export interface organizationsInterface extends mongoose.Document{
    organization_name: string;
    category_type: categoryTypeEnum;
    unique_url: string;
    website: string;
    logo: string;
    description: string;
    industry: string;
    location: string;
    size: organizationSizeEnum;
    type: organizationTypeEnum;
    posts: postsInterface[];
    followers: usersInterface[];
    blocked: usersInterface[];
    conversations: conversationsInterface[];
    admins:{
        admin: usersInterface,
        level: adminLevelEnum
    }[]
}

const organizationsSchema = new Schema<organizationsInterface>({
    organization_name: { type: String, required: true },
    category_type: { type: String, enum: Object.values(categoryTypeEnum), required: true },
    unique_url: { type: String, required: true },
    website: { type: String},
    logo: { type: String},
    description: { type: String},
    industry: { type: String, required: true },
    location: { type: String},
    size: { type: String, enum: Object.values(organizationSizeEnum), required: true },
    type: { type: String, enum: Object.values(organizationTypeEnum), required: true },
    posts: [{ type: Schema.Types.ObjectId, ref: "posts" }],
    followers: [{ type: Schema.Types.ObjectId, ref: "users" }],
    blocked: [{ type: Schema.Types.ObjectId, ref: "users" }],
    conversations: [{ type: Schema.Types.ObjectId, ref: "conversations" }],
    admins:[{
        admin:{ type: Schema.Types.ObjectId, ref: "users" },
        level:{ type: String, enum: Object.values(adminLevelEnum), required: true }
    }]
});

const organizations = mongoose.model<organizationsInterface>('organizations', organizationsSchema);

export default organizations;