import mongoose, { Schema } from "mongoose";
import { jobApplicationsInterface } from "./job_applications.model";
import { screeningQuestionsInterface } from "./screening_questions.model";


export interface jobsInterface extends mongoose.Document{
    company_id: string;
    job_title: string;
    location: string;
    job_type: Enumerator;
    workplace_type: Enumerator;
    company_industry:[];
    experience_level:Enumerator;
    job_description: string;
    targetted_skills: string[];
    receive_applicants_by:Enumerator;
    receiving_method: string;
    screening_questions:screeningQuestionsInterface;
    how_did_you_hear_about_us:Enumerator;
    salary: number;
    applied_applications:jobApplicationsInterface[];
}

const jobsSchema = new Schema<jobsInterface>({
    company_id: { type: String, required: true },
    job_title: { type: String, required: true },
    location: { type: String, required: true },
    job_type: [{ type: Enumerator, required: true }],
    workplace_type: { type: Enumerator, required: true },
    company_industry: [{ type: String, required: true }],
    experience_level: { type: String, required: true },
    job_description: { type: String, required: true },
    targetted_skills: [{ type: String, required: true }],
    receive_applicants_by: { type: String, required: true },
    receiving_method: { type: String, required: true },
    screening_questions: { type: Schema.Types.ObjectId, ref: "screeningQuestions"},
    how_did_you_hear_about_us: { type: Enumerator, required: true },
    salary: { type: Number},
    applied_applications: [{ type: Schema.Types.ObjectId, ref: "jobApplications" }]
});

const jobs = mongoose.model<jobsInterface>('jobs', jobsSchema);

export default jobs;