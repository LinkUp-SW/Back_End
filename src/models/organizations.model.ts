import mongoose, { Schema } from "mongoose";
import { postsInterface } from "./posts.model.ts";
import { usersInterface } from "./users.model.ts";
import { conversationsInterface } from "./conversations.model.ts";

const DEFAULT_IMAGE_URL = "https://res.cloudinary.com/dyhnxqs6f/image/upload/v1719229880/meme_k18ky2_c_crop_w_674_h_734_x_0_y_0_u0o1yz.png";

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
    Public_organization = "Public company",
    Private_company = "Private company",
    Government_agency = "Government agency",
    Nonprofit = "Nonprofit",
    Partnership = "Partnership",
    university = "University",
    college = "College",
    high_school = "High school",
    middle_school = "Middle school",
    elementary_school = "Elementary school"
}

export enum categoryTypeEnum{
    company = "company",
    education = "education"
}

export interface organizationsInterface extends mongoose.Document{
    name: string;
    category_type: categoryTypeEnum;
    website: string;
    logo: string;
    tagline: string;
    description: string;
    industry: string;
    location: {
        country: string;
        address: string;
        city: string;
        state: string;
        postal_code: string;
        location_name: string;
    };
    phone: string;
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
    website: { type: String},
    logo: { type: String,
        default: DEFAULT_IMAGE_URL,
    },
    tagline: { type: String},
    description: { type: String},
    industry: { type: String },
    location: {
        country: { type: String },
        address: { type: String },
        city: { type: String },
        state: { type: String },
        postal_code: { type: String },
        location_name: { type: String }
    },
    phone: { type: String },
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