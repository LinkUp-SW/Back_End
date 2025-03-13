import mongoose, { Schema } from "mongoose"
import { skillsInterface } from "./skills.model.ts";
import { mediaInterface } from "./media.model.ts";
import { organizationsInterface } from "./organizations.model.ts";


export interface licenseAndCertificationsInterface extends mongoose.Document{
    name: string;
    issuing_organization: organizationsInterface;
    issue_date: Date;
    expiration_date: Date;
    credintial_id: number;
    credintial_url: string;
    skills: skillsInterface[];
    media: mediaInterface;
}

const licenseAndCertificationsSchema = new Schema<licenseAndCertificationsInterface>({
    name: { type: String, required: true },
    issuing_organization: { type: Schema.Types.ObjectId, ref: 'organizations', required: true },
    issue_date: { type: Date },
    expiration_date: { type: Date },
    credintial_id: { type: Number },
    credintial_url: { type: String },
    skills: [{ type: Schema.Types.ObjectId, ref: 'skills' }],
    media: { type: Schema.Types.ObjectId, ref: 'media' }
})


const licenseAndCertifications = mongoose.model<licenseAndCertificationsInterface>('licenseAndCertifications', licenseAndCertificationsSchema);

export default licenseAndCertifications;