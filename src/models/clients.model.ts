import mongoose, { Schema } from "mongoose";
import { bioInterface } from "./bio.model";
import { educationsInterface } from "./educations.model";
import { experiencesInterface } from "./experiences.model";
import { skillsInterface } from "./skills.model";


export interface clientsInterface extends mongoose.Document{
    bio: bioInterface;
    education: educationsInterface[];
    work_experience: experiencesInterface[];
    skills: skillsInterface[];
    // liscence_certificates:
    industry: string;
    profile_photo: string;
    cover_photo: string;
    resume: string;
    connections: clientsInterface[];
    followers: clientsInterface[];
    following: clientsInterface[];
    // privacy_settings:
    // activity:
    status: Enumerator; 
    blocked: clientsInterface[];
    // conversations:
    notification: object[];
    // applied_jobs:
    // saved_jobs:
    sex: string;
    subscription:{
            subscribed: Boolean,
            subscription_started_at:Date
    }
}

const clientsSchema = new mongoose.Schema<clientsInterface>({
    bio: { type: Schema.Types.ObjectId, ref: "bio" },
    education: [{ type: Schema.Types.ObjectId, ref: "educations" }],
    work_experience: [{ type: Schema.Types.ObjectId, ref: "experiences" }],
    skills: [{ type: Schema.Types.ObjectId, ref: "skills" }],
    // liscence_certificates
    industry: { type: String, required: true },
    profile_photo: { type: String, required: true },
    cover_photo: { type: String, required: true },
    resume: { type: String, required: true },
    connections: [{ type: Schema.Types.ObjectId, ref: "clients" }],
    followers: [{ type: Schema.Types.ObjectId, ref: "clients" }],
    following: [{ type: Schema.Types.ObjectId, ref: "clients" }],
    // privacy_settings
    // activity
    status: { type: Enumerator, required: true },
    blocked: [{ type: Schema.Types.ObjectId, ref: "clients" }],
    // conversations
    // notification
    // applied_jobs
    // saved_jobs
    sex: { type: String, required: true },
    subscription:{
            subscribed: Boolean,
            subscription_started_at:Date
    }
});

const clients = mongoose.model<clientsInterface>('clients',clientsSchema);
export default clients 