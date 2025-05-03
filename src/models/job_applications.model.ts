import mongoose, { Schema } from "mongoose";
import { jobsInterface } from "./jobs.model.ts";
import { usersInterface } from "./users.model.ts";

export enum applicationStatusEnum{
    pending = "Pending",
    viewed = "Viewed",
    accepted = "Accepted",
    rejected = "Rejected"
}

export interface jobApplicationsInterface extends mongoose.Document{
    job_id: jobsInterface;
    user_id: usersInterface;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: number;
    country_code: string;
    resume: string;
    application_status: applicationStatusEnum;
    resolved_at?: number;
}

const jobApplicationsSchema = new Schema<jobApplicationsInterface>({
    job_id: { type: Schema.Types.ObjectId, ref: "jobs" },
    user_id: { type: Schema.Types.ObjectId, ref: "users" },
    first_name: { type: String },
    last_name: { type: String },
    email: { 
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
    application_status: { type: String, enum: Object.values(applicationStatusEnum), default: applicationStatusEnum.pending },
    resolved_at:{ type: Number }
});

const jobApplications = mongoose.model<jobApplicationsInterface>('jobApplications', jobApplicationsSchema);

export default jobApplications;