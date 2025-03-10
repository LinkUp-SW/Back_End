import mongoose, { Schema } from "mongoose";
import { jobsInterface } from "./jobs.model.ts";
import { usersInterface } from "./users.model.ts";


export interface jobApplicationsInterface extends mongoose.Document{
    job_id: jobsInterface;
    user_id: usersInterface;
    first_name: string;
    last_name: string;
    email_address: string;
    phone_number: number;
    country_code: string;
    resume: string;
    questions_responses: string[];
    application_status: Enumerator;
}

const jobApplicationsSchema = new Schema<jobApplicationsInterface>({
    job_id: { type: Schema.Types.ObjectId, ref: "jobs", required:true },
    user_id: { type: Schema.Types.ObjectId, ref: "users", required:true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email_address: { 
        type: String, 
        required: true,
        validate: {
            validator: function(v: string) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`
        }
    },
    phone_number: { type: Number, required: true },
    country_code: { type: String, required: true },
    resume: { type: String, required: true },
    questions_responses: [{ type: String, required: true }],
    application_status: { type: String, required: true }
});

const jobApplications = mongoose.model<jobApplicationsInterface>('jobApplications', jobApplicationsSchema);

export default jobApplications;