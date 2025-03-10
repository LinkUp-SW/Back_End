import mongoose, { Schema } from "mongoose";
import { jobApplicationsInterface } from "./job_applications.model.ts";
import { screeningQuestionsInterface } from "./screening_questions.model.ts";
import { companiesInterface } from "./companies.model.ts";

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
    beginner = "Beginner",
    intermediate = "Intermediate",
    advanced = "Advacned"
}

export enum howDidYouHearAboutUsEnum{
    friend = "From a friend",
    colleague = "From a colleague",
    website = "From website",
    linkup = "From linkup",
    ad = "From an ad"
}

export interface jobsInterface extends mongoose.Document{
    company_id: companiesInterface;
    job_title: string;
    location: string;
    job_type: jobTypeEnum;
    workplace_type: workplaceTypeEnum;
    company_industry:[];
    experience_level:experienceLevelEnum;
    job_description: string;
    targetted_skills: string[];
    receive_applicants_by:receiveApplicantsByEnum;
    receiving_method: string;
    screening_questions:screeningQuestionsInterface;
    how_did_you_hear_about_us:howDidYouHearAboutUsEnum;
    salary: number;
    applied_applications:jobApplicationsInterface[];
}

const jobsSchema = new Schema<jobsInterface>({
    company_id: { type: Schema.Types.ObjectId, ref: "companies", required:true },
    job_title: { type: String, required: true },
    location: { type: String, required: true },
    job_type: { type: String, enum: Object.values(jobTypeEnum), required: true },
    workplace_type: { type: String, enum: Object.values(workplaceTypeEnum), required: true },
    company_industry: [{ type: String, required: true }],
    experience_level: { type: String, enum: Object.values(experienceLevelEnum), required: true },
    job_description: { type: String, required: true },
    targetted_skills: [{ type: String, required: true }],
    receive_applicants_by: { type: String, required: true },
    receiving_method: { type: String, required: true },
    screening_questions: { type: Schema.Types.ObjectId, ref: "screeningQuestions"},
    how_did_you_hear_about_us: { type: String, enum: Object.values(howDidYouHearAboutUsEnum), required: true },
    salary: { type: Number},
    applied_applications: [{ type: Schema.Types.ObjectId, ref: "jobApplications" }]
});

const jobs = mongoose.model<jobsInterface>('jobs', jobsSchema);

export default jobs;