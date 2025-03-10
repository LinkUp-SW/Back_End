import mongoose from "mongoose";
import { clientsInterface } from "./clients.model.ts";
import { educationsInterface } from "./educations.model.ts";
import { licenseAndCertificationsInterface } from "./license_and_certifications.model.ts";
import { experiencesInterface } from "./experiences.model.ts";
export interface skillsInterface extends mongoose.Document{
    name: string;
    endorsments:clientsInterface[];
    used_where: [
        educations:educationsInterface[], 
        certificates:licenseAndCertificationsInterface[],
        experience:experiencesInterface[] 
      ];
}

const skillsSchema = new mongoose.Schema<skillsInterface>({
    name: { type:String, required:true},
    endorsments: [{type: mongoose.Schema.Types.ObjectId, ref:"clients"}],
    used_where: {
      educations: [{ type: mongoose.Schema.Types.ObjectId, ref: "educations" }],
      certificates: [{ type: mongoose.Schema.Types.ObjectId, ref: "licenseAndCertifications" }],
      experience: [{ type: mongoose.Schema.Types.ObjectId, ref: "experiences" }]
    }
})

const skills  = mongoose.model<skillsInterface>('skills',skillsSchema);
export default skills