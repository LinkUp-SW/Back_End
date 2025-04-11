import mongoose, { Schema } from "mongoose";
import { jobApplicationsInterface } from "./job_applications.model.ts";
import { organizationsInterface } from "./organizations.model.ts";

export enum jobTypeEnum{
    full_time="Full-time",
   part_time ="Part-time",
   contract ="Contract",
   temporary ="Temporary",
    other ="Other",
    volunteer="Volunteer",
    internship="Internship"
}
export enum workplaceTypeEnum{
    on_site = "On-site",
    hybrid = "Hybrid",
    remote = "Remote"
}

export enum receiveApplicantsByEnum{
    email = "Email",
    external = "At an external website"
}

export enum experienceLevelEnum{
    Internship = "Internship",
    Entry_Level = "Entry Level",
    Associate = "Associate",
    Mid_Senior = "Mid-Senior",
    Director = "Director",
    Executive = "Executive",
}

export enum howDidYouHearAboutUsEnum{
    friend = "From a friend",
    colleague = "From a colleague",
    website = "From website",
    linkup = "From linkup",
    ad = "From an ad"
}

export interface jobsInterface extends mongoose.Document{
    organization_id: organizationsInterface;
    job_title: string;
    location: string;
    job_type: jobTypeEnum;
    workplace_type: workplaceTypeEnum;
    organization_industry:[];
    experience_level: experienceLevelEnum;
    description: string;
    qualifications: string[];
    responsibilities: string[];
    benefits: string[];
    targetted_skills: string[];
    receive_applicants_by: receiveApplicantsByEnum;
    receiving_method: string;
    screening_questions: {
        questions: string;
        answers: string[];
        ideal_answer: string;
        is_must_qualification: boolean;
        rejection_message?: string;
        is_filtererd: boolean;
    };
    how_did_you_hear_about_us: howDidYouHearAboutUsEnum;
    salary: number;
    posted_time: Date;
    applied_applications: jobApplicationsInterface[];
}

const jobsSchema = new Schema<jobsInterface>({
    organization_id: { type: Schema.Types.ObjectId, ref: "organizations" },
    job_title: { type: String },
    location: { type: String },
    job_type: { type: String, enum: Object.values(jobTypeEnum) },
    workplace_type: { type: String, enum: Object.values(workplaceTypeEnum) },
    organization_industry: [{ type: String }],
    experience_level: { type: String, enum: Object.values(experienceLevelEnum) },
    description: { type: String },
    qualifications: [{ type: String }],
    responsibilities: [{ type: String }],
    benefits: [{ type: String }],
    targetted_skills: [{ type: String }],
    receive_applicants_by: { type: String, enum: Object.values(receiveApplicantsByEnum) },
    receiving_method: { type: String },
    screening_questions: {
        questions: { type: String },
        answers: [{ type: String }],
        ideal_answer: { type: String },
        is_must_qualification: { type: Boolean },
        rejection_message: { type: String },
        is_filtererd: { type: Boolean },
    },
    how_did_you_hear_about_us: { type: String, enum: Object.values(howDidYouHearAboutUsEnum) },
    salary: { type: Number },
    posted_time: { type: Date, default: Date.now },
    applied_applications: [{ type: Schema.Types.ObjectId, ref: "jobApplications" }],
});

const jobs = mongoose.model<jobsInterface>('jobs', jobsSchema);

export default jobs;