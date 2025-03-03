import mongoose, { Schema } from "mongoose";
import { bioInterface } from "./bio.model";
import { educationsInterface } from "./educations.model";
import { experiencesInterface } from "./experiences.model";
import { skillsInterface } from "./skills.model";
import { privacySettingsInterface } from "./privacy_settings.model";
import { licenseAndCertificationsInterface } from "./license_and_certifications.model";
import { conversationsInterface } from "./conversations.model";
import { activityInterface } from "./activity.model";
import { jobsInterface } from "./jobs.model";


export interface clientsInterface extends mongoose.Document{
    bio: bioInterface;
    education: educationsInterface[];
    work_experience: experiencesInterface[];
    skills: skillsInterface[];
    liscence_certificates: licenseAndCertificationsInterface[];
    industry: string;
    profile_photo: string;
    cover_photo: string;
    resume: string;
    connections: clientsInterface[];
    followers: clientsInterface[];
    following: clientsInterface[];
    privacy_settings: privacySettingsInterface;
    activity:activityInterface[]
    status: Enumerator; 
    blocked: clientsInterface[];
    conversations: conversationsInterface[];
    notification: Notification[];
    applied_jobs: jobsInterface[];
    saved_jobs: jobsInterface[];
    sex: Enumerator;
    subscription:{
            subscribed: Boolean,
            subscription_started_at:Date
    };
    is_student: boolean;
    is_verified: boolean;
    is_16_or_above: boolean;
}

const clientsSchema = new mongoose.Schema<clientsInterface>({
    bio: { type: Schema.Types.ObjectId, ref: "bio" },
    education: [{ type: Schema.Types.ObjectId, ref: "educations" }],
    work_experience: [{ type: Schema.Types.ObjectId, ref: "experiences" }],
    skills: [{ type: Schema.Types.ObjectId, ref: "skills" }],
    liscence_certificates: [{ type: Schema.Types.ObjectId, ref: "licenseAndCertifications" }],
    industry: { type: String},
    profile_photo: { type: String },
    cover_photo: { type: String },
    resume: { type: String },
    connections: [{ type: Schema.Types.ObjectId, ref: "clients" }],
    followers: [{ type: Schema.Types.ObjectId, ref: "clients" }],
    following: [{ type: Schema.Types.ObjectId, ref: "clients" }],
    privacy_settings: { type: Schema.Types.ObjectId, ref: "privacy_settings" },
    activity: [{ type: Schema.Types.ObjectId, ref: "activity" }],
    status: { type: Enumerator },
    blocked: [{ type: Schema.Types.ObjectId, ref: "clients" }],
    conversations: [{ type: Schema.Types.ObjectId, ref: "skills" }],
    notification: [{type: Notification}],
    applied_jobs:[{ type: Schema.Types.ObjectId, ref: "jobs" }],
    saved_jobs:[{ type: Schema.Types.ObjectId, ref: "jobs" }],
    sex: { type: Enumerator, required: true },
    subscription:{
            subscribed: Boolean,
            subscription_started_at:Date
    },
    is_student: { type: Boolean, required: true },
    is_verified: { type: Boolean, required: true },
    is_16_or_above: { type: Boolean, required: true }
});

const clients = mongoose.model<clientsInterface>('clients',clientsSchema);
export default clients 