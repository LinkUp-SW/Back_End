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
    application_status: string;
}

const jobApplicationsSchema = new Schema<jobApplicationsInterface>({
    job_id: { type: Schema.Types.ObjectId, ref: "jobs" },
    user_id: { type: Schema.Types.ObjectId, ref: "users" },
    first_name: { type: String },
    last_name: { type: String },
    email_address: { 
        type: String, 
        validate: {
            validator: function(v: string) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`
        }
    },
    phone_number: { type: Number },
    country_code: { type: String },
    resume: { type: String },
    application_status: { type: String }
});

const jobApplications = mongoose.model<jobApplicationsInterface>('jobApplications', jobApplicationsSchema);

export default jobApplications;