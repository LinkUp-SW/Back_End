import mongoose, { Schema, ObjectId, Types } from "mongoose";
import validator from "validator";
import { conversationsInterface } from "./conversations.model.ts";
import { postsInterface } from "./posts.model.ts";
import { repostsInterface } from "./reposts.model.ts";
import { commentsInterface } from "./comments.model.ts";
import { jobsInterface } from "./jobs.model.ts";
import { organizationsInterface } from "./organizations.model.ts";
import bcrypt from "bcrypt";

export enum sexEnum{
    male="Male",
    female="Female"
}

export enum statusEnum {
    finding_new_job = "Finding a new job",
    hiring = "Hiring",
    providing_services = "Providing services",
    finding_volunteer_opportunities = "Finding volunteer opportunities"
}

export enum invitationsEnum{
    everyone = "Everyone",
    email = "email",

}

export enum accountStatusEnum{
    public = "Public",
    private = "Private",
    connections = "Connections only"
}

export enum followEnum{
    everyone = "Everyone",
    connections = "Connections only"
}

export interface ConnectionRequest {
    _id: ConnectionUserInterface;
    date: Date;
  }

export interface ConnectionUserInterface {
    _id?: mongoose.Types.ObjectId | string;
    user_id?: string;
    name: string;
    headline: string | null;
    profilePicture: string | null;
    numberOfMutualConnections?: number; 
    nameOfOneMutualConnection?: string | null; 
    date?: Date; 
    bio?: {
        first_name?:string;
        last_name?:string;
        headline?:string;
    };
    connections?: mongoose.Types.ObjectId[];
    
  }

const DEFAULT_IMAGE_URL = "https://res.cloudinary.com/dyhnxqs6f/image/upload/v1719229880/meme_k18ky2_c_crop_w_674_h_734_x_0_y_0_u0o1yz.png";

export interface usersInterface extends mongoose.Document{
    user_id: string;
    name: string;
    email: string;
    password: string;
    phone_number: number;
    country_code: string;
    comparePassword: (password: string) => Promise<boolean>; // 
    bio: {
        first_name:string;
        last_name:string;
        headline:string;
        experience: string[];
        education: string[];
        website:string;
        contact_info:{
            phone_number: number;
            country_code: string;
            phone_type: string;
            address: string;
            birthday: Date;
            website: string;
        };
        location:{
            country_region: string;
            city: string;
        };
    };
    education: {
        _id: string;
        school: organizationsInterface;
        degree: string;
        field_of_study: string;
        start_date: Date;
        end_date: Date;
        grade: string;
        activites_and_socials: string;
        skills: string[];
        description: string;
        media: {
            media: string,
            title: string,
            description: string
        }[];
    }[];
    work_experience: {
        _id : string
        title: string;
        employee_type: string;
        organization: organizationsInterface;
        is_current: boolean;
        start_date: Date;
        end_date: Date; 
        location: string;
        description: string;
        location_type: string;
        skills: string[];   
        media: {
            media: string,
            title: string,
            description: string
        }[];
    }[];
    organizations: organizationsInterface;
    skills: {
        _id: string;
        name: string;
        endorsments: usersInterface[];
        used_where: string[];
    }[];
    liscence_certificates: {
        _id: string;
        name: string;
        issuing_organization: organizationsInterface;
        issue_date: Date;
        expiration_date: Date;
        credintial_id: number;
        credintial_url: string;
        skills: string[];
        media: {
            media: string,
            title: string,
            description: string
        }[];
    }[];
    industry: string;
    profile_photo: string;
    cover_photo: string;
    resume: string;
    connections: ConnectionRequest[];
    received_connections: ConnectionRequest[];
    sent_connections: ConnectionRequest[];
    withdrawn_connections: ConnectionRequest[];
    followers: Types.ObjectId[];
    following: Types.ObjectId[];
    privacy_settings: {
        flag_account_status: accountStatusEnum;
        flag_who_can_send_you_invitations: invitationsEnum;
        flag_messaging_requests: boolean;
        messaging_read_receipts: boolean;
        make_follow_primary: boolean;
        Who_can_follow_you: followEnum
    };
    activity: {
        posts: postsInterface[];
        reposted_posts: repostsInterface[];
        reacted_posts:postsInterface[];
        comments: commentsInterface[];
        media: {
            media: string,
            title: string,
            description: string
        }[];
    };
    status: statusEnum; 
    blocked: ConnectionRequest[];
    unblocked_users: ConnectionRequest[];
    conversations: conversationsInterface[];
    notification: {
        seen : boolean,
        user_id : string,
        sender_user_id: string,
        conversation_id: string,
        post_id: string,
        comment_id: string,
        react: boolean
    }[];
    applied_jobs: jobsInterface[];
    saved_jobs: jobsInterface[];
    sex: sexEnum;
    subscription:{
        subscribed: boolean,
        subscription_started_at: Date
    };
    is_student: boolean;
    is_verified: boolean;
    is_16_or_above: boolean;
}

const usersSchema = new mongoose.Schema<usersInterface>({
    user_id:{
        type: String,
        required:false,
        unique:true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function (v: string) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: (props) => `${props.value} is not a valid email!`,
        },
    },
    password: { type: String, required: true },
    phone_number: { type: Number },
    country_code: { type: String },
    bio: {
        first_name: { type: String },
        last_name: { type: String },
        headline: { type: String },
        experience: [{ type: String }],
        education: [{ type: String }],
        website: { type: String },
        contact_info: {
            phone_number: { type: Number },
            country_code: { type: String },
            phone_type: { type: String },
            address: { type: String },
            birthday: { type: Date },
            website: { type: String },
        },
        location: {
            country_region: { type: String },
            city: { type: String },
        },
    },
    education: [
        {
            _id: { type: String },
            school: { type: Schema.Types.Mixed,
                validate: {
                  validator: function (value) {
                    return typeof value === "string" || mongoose.isValidObjectId(value);
                  },
                  message: "School must be either an ObjectId or a string",
                },
                ref: "organizations",
              },
            degree: { type: String },
            field_of_study: { type: String },
            start_date: { type: Date },
            end_date: { type: Date },
            grade: { type: String },
            activites_and_socials: { type: String },
            skills: [{ type: String }],
            description: { type: String },
            media: [
                {
                    media: { type: String },
                    title: { type: String },
                    description: { type: String },
                },
            ],
        },
    ],
    work_experience: [
        {
            _id: { type: String },
            title: { type: String },
            employee_type: { type: String },
            organization: { type: Schema.Types.Mixed,
                validate: {
                  validator: function (value) {
                    return typeof value === "string" || mongoose.isValidObjectId(value);
                  },
                  message: "Company must be either an ObjectId or a string",
                },
                ref: "organizations",
              },
            is_current: { type: Boolean },
            start_date: { type: Date },
            end_date: { type: Date },
            location: { type: String },
            description: { type: String },
            location_type: { type: String },
            skills: [{ type: String }],
            media: [
                {
                    media: { type: String },
                    title: { type: String },
                    description: { type: String },
                },
            ],
        },
    ],
    organizations: [{ type: Schema.Types.ObjectId, ref: "organizations" }],
    skills: [{
        _id: { type: String },
        name: { type: String },
        endorsments: [{ type: Schema.Types.ObjectId, ref: "users" }],
        used_where: [{ type: Schema.Types.ObjectId, ref: "organizations" }],
    },],
    liscence_certificates: [
        {
            _id: { type: String},
            name: { type: String },
            issuing_organization: { type: Schema.Types.Mixed,
                validate: {
                  validator: function (value) {
                    return typeof value === "string" || mongoose.isValidObjectId(value);
                  },
                  message: "Company must be either an ObjectId or a string",
                },
                ref: "organizations",
              },
            issue_date: { type: Date },
            expiration_date: { type: Date },
            credintial_id: { type: Number },
            credintial_url: { type: String },
            skills: [{ type: String }],
            media: [
                {
                    media: { type: String },
                    title: { type: String },
                    description: { type: String },
                },
            ],
        },
    ],
    industry: { type: String },


    profile_photo: {
        type: String,
        validate: {
          validator: function (value: string | null) {
            return value === null || value === "" || validator.isURL(value);
          },
          message: "Profile photo must be a valid URL, an empty string, or null",
        },
        default: DEFAULT_IMAGE_URL, 
      },
      cover_photo: {
        type: String,
        validate: {
          validator: function (value: string | null) {
            return value === null || value === "" || validator.isURL(value);
          },
          message: "Cover photo must be a valid URL, an empty string, or null",
        },
        default: DEFAULT_IMAGE_URL,
      },
      resume: {
        type: String,
        validate: {
          validator: function (value: string | null) {
            return value === null || value === "" || validator.isURL(value);
          },
          message: "Resume must be a valid URL, an empty string, or null",
        },
        default: null,
      },
      connections: [
        {
          _id: { type: Schema.Types.ObjectId, ref: "users" }, // Reference to the user's ObjectId
          date: { type: Date, default: Date.now },
        },
      ],
      received_connections: [
        {
          _id: { type: Schema.Types.ObjectId, ref: "users" }, // Reference to the user's ObjectId
          date: { type: Date, default: Date.now },
        },
      ],
      sent_connections: [
        {
          _id: { type: Schema.Types.ObjectId, ref: "users" }, // Reference to the user's ObjectId
          date: { type: Date, default: Date.now },
        },
      ],
      withdrawn_connections: [
        {
          _id: { type: Schema.Types.ObjectId, ref: "users" }, // Reference to the user's ObjectId
          date: { type: Date },
        },
      ],
      followers: [{ type: Schema.Types.ObjectId, ref: "users" }], // Reference to the user's ObjectId
      following: [{ type: Schema.Types.ObjectId, ref: "users" }], // Reference to the user's ObjectId
    privacy_settings: {
        flag_account_status: { type: String, enum: Object.values(accountStatusEnum) },
        flag_who_can_send_you_invitations: { type: String, enum: Object.values(invitationsEnum) },
        flag_messaging_requests: { type: Boolean },
        messaging_read_receipts: { type: Boolean },
        make_follow_primary: { type: Boolean },
        Who_can_follow_you: { type: String, enum: Object.values(followEnum) },
    },
    activity: {
        posts: [{ type: Schema.Types.ObjectId, ref: "posts" }],
        reposted_posts: [{ type: Schema.Types.ObjectId, ref: "reposts" }],
        reacted_posts: [{ type: Schema.Types.ObjectId, ref: "posts" }],
        comments: [{ type: Schema.Types.ObjectId, ref: "comments" }],
        media: [{
            media: { type: String },
            title: { type: String },
            description: { type: String },
        }]
    },
    status: { type: String, enum: Object.values(statusEnum)},
    blocked: [
        {
          _id: { type: Schema.Types.ObjectId, ref: "users" }, // Reference to the user's ObjectId
          date: { type: Date, required: true },
        },
      ],
    unblocked_users: [
        {
          _id: { type: Schema.Types.ObjectId, ref: "users" }, // Reference to the user's ObjectId
          date: { type: Date, required: true },
        },
      ],
    conversations: [{ type: Schema.Types.ObjectId, ref: "conversations" }],
    notification: [{
        seen: { type: Boolean },
        user_id: { type: String },
        sender_user_id: { type: String },
        conversation_id: { type: String },
        post_id: { type: String },
        comment_id: { type: String },
        react: { type: Boolean },
    },],
    applied_jobs: [{ type: Schema.Types.ObjectId, ref: "jobs" }],
    saved_jobs: [{ type: Schema.Types.ObjectId, ref: "jobs" }],
    sex: { type: String, enum: Object.values(sexEnum)},
    subscription: {
        subscribed: { type: Boolean },
        subscription_started_at: { type: Date },
    },
    is_student: { type: Boolean},
    is_verified: { type: Boolean},
    is_16_or_above: { type: Boolean },
});

usersSchema.pre('save', async function(next) {
    const user = this as usersInterface;
    if (!user.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        next();
    } catch (err:any) {
        next(err);
    }
});

usersSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
}

const users = mongoose.model<usersInterface>('users',usersSchema);
export default users