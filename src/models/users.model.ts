import mongoose, { Schema } from "mongoose";
import validator from "validator";
import { conversationsInterface } from "./conversations.model.ts";
import { activityInterface } from "./activity.model.ts";
import { jobsInterface } from "./jobs.model.ts";
import { reactsInterface } from "./reactions.model.ts";
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


export interface usersInterface extends mongoose.Document{
    user_id: string;
    name: string;
    email: string;
    password: string;
    phone_number: number;
    country_code: string;
    comparePassword: (password: string) => Promise<boolean>;
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
        school: organizationsInterface;
        degree: string;
        field_of_study: string;
        start_date: Date;
        end_date: Date;
        grade: string;
        activites_and_socials: string;
        skills: string[];
        description: string;
        media: [{
            media: string,
            title: string,
            description: string
        }];
    }[];
    work_experience: {
        title: string;
        employee_type: string;
        organization: organizationsInterface | string;
        is_current: boolean;
        start_date: Date;
        end_date: Date; 
        location: string;
        description: string;
        location_type: string;
        skills: string[];   
        media: [{
            media: string,
            title: string,
            description: string
        }];
    }[];
    organizations: organizationsInterface;
    skills: {
        name: string;
        endorsments:usersInterface[];
        used_where:[{
            educations: string[], 
            certificates: string[],
            experience: string[] 
        }];
    }[];
    liscence_certificates: {
        name: string;
        issuing_organization: organizationsInterface;
        issue_date: Date;
        expiration_date: Date;
        credintial_id: number;
        credintial_url: string;
        skills: string[];
        media: [{
            media: string,
            title: string,
            description: string
        }];
    }[];
    industry: string;
    profile_photo: string;
    cover_photo: string;
    resume: string;
    connections: usersInterface[];
    followers: usersInterface[];
    following: usersInterface[];
    privacy_settings: {
        flag_account_status: accountStatusEnum;
        flag_who_can_send_you_invitations: invitationsEnum;
        flag_messaging_requests: boolean;
        messaging_read_receipts: boolean;
    };
    activity: activityInterface[]
    status: statusEnum; 
    blocked: usersInterface[];
    conversations: conversationsInterface[];
    notification: {
        seen : boolean,
        user_id :string,
        sender_user_id:string,
        conversation_id:string,
        post_id:string,
        comment_id:string,
        react:reactsInterface
    }[];
    applied_jobs: jobsInterface[];
    saved_jobs: jobsInterface[];
    sex: sexEnum;
    subscription:{
        subscribed: Boolean,
        subscription_started_at:Date
    };
    is_student: boolean;
    is_verified: boolean;
    is_16_or_above: boolean;
}

const usersSchema = new mongoose.Schema<usersInterface>({
    user_id: {type: String , required: true},
    name: { type: String }, // Name is optional due to Google/email signup
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
            school: { type: Schema.Types.ObjectId, ref: "organizations" },
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
            title: { type: String },
            employee_type: { type: String },
            organization: { type: Schema.Types.ObjectId, ref: "organizations" },
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
    skills: [
        {
            name: { type: String },
            endorsments: [{ type: Schema.Types.ObjectId, ref: "users" }],
            used_where: [
                {
                    educations: [{ type: String }],
                    certificates: [{ type: String }],
                    experience: [{ type: String }],
                },
            ],
        },
    ],
    liscence_certificates: [
        {
            name: { type: String },
            issuing_organization: { type: Schema.Types.ObjectId, ref: "organizations" },
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
    profile_photo: { type: String, validate: validator.isURL },
    cover_photo: { type: String, validate: validator.isURL },
    resume: { type: String, validate: validator.isURL },
    connections: [{ type: Schema.Types.ObjectId, ref: "users" }],
    followers: [{ type: Schema.Types.ObjectId, ref: "users" }],
    following: [{ type: Schema.Types.ObjectId, ref: "users" }],
    privacy_settings: {
        flag_account_status: { type: String, enum: Object.values(accountStatusEnum) },
        flag_who_can_send_you_invitations: { type: String, enum: Object.values(invitationsEnum) },
        flag_messaging_requests: { type: Boolean },
        messaging_read_receipts: { type: Boolean },
    },
    activity: [{ type: Schema.Types.ObjectId, ref: "activity" }],
    status: { type: String, enum: Object.values(statusEnum), required: false },
    blocked: [{ type: Schema.Types.ObjectId, ref: "users" }],
    conversations: [{ type: Schema.Types.ObjectId, ref: "conversations" }],
    notification: [
        {
            seen: { type: Boolean },
            user_id: { type: String },
            sender_user_id: { type: String },
            conversation_id: { type: String },
            post_id: { type: String },
            comment_id: { type: String },
            react: { type: Schema.Types.ObjectId, ref: "reacts" },
        },
    ],
    applied_jobs: [{ type: Schema.Types.ObjectId, ref: "jobs" }],
    saved_jobs: [{ type: Schema.Types.ObjectId, ref: "jobs" }],
    sex: { type: String, enum: Object.values(sexEnum), required: true },
    subscription: {
        subscribed: { type: Boolean },
        subscription_started_at: { type: Date },
    },
    is_student: { type: Boolean, required: true },
    is_verified: { type: Boolean, required: true },
    is_16_or_above: { type: Boolean, required: true },
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