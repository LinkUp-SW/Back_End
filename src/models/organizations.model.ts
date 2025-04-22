import mongoose, { Schema } from "mongoose";
import { postsInterface } from "./posts.model.ts";
import { usersInterface } from "./users.model.ts";
import { conversationsInterface } from "./conversations.model.ts";


export enum organizationSizeEnum {
    small_1_10 = "1-10 employees",
    small_11_50 = "11-50 employees",
    medium_51_200 = "51-200 employees",
    medium_201_500 = "201-500 employees",
    large_501_1000 = "501-1000 employees",
    large_1001_5000 = "1001-5000 employees",
    large_5001_10000 = "5001-10000 employees",
    enterprise_10001_plus = "10001+ employees",
  }

export enum organizationTypeEnum{
    public_organization = "Public company",
    self_employed = "Private company",
    government_agency = "Government agency",
    nonprofit = "Nonprofit",
    partnership = "Partnership",
    university = "University",
    college = "College",
    high_school = "High School",
    middle_school = "Middle School",
    elementary_school = "Elementary School"
}

export enum categoryTypeEnum{
    company = "company",
    education = "education"
}

export interface organizationsInterface extends mongoose.Document{
    name: string;
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
    admins: usersInterface[]
}

const organizationsSchema = new Schema<organizationsInterface>({
    name: { type: String },
    category_type: { type: String, enum: Object.values(categoryTypeEnum) },
    unique_url: { type: String },
    website: { type: String},
    logo: { type: String},
    description: { type: String},
    industry: { type: String },
    location: { type: String},
    size: { type: String, enum: Object.values(organizationSizeEnum) },
    type: { type: String, enum: Object.values(organizationTypeEnum) },
    posts: [{ type: Schema.Types.ObjectId, ref: "posts" }],
    followers: [{ type: Schema.Types.ObjectId, ref: "users" }],
    blocked: [{ type: Schema.Types.ObjectId, ref: "users" }],
    conversations: [{ type: Schema.Types.ObjectId, ref: "conversations" }],
    admins:[{ type: Schema.Types.ObjectId, ref: "users" }]
});

const organizations = mongoose.model<organizationsInterface>('organizations', organizationsSchema);

export default organizations;