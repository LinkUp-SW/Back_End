import mongoose from "mongoose";
import { clientsInterface } from "./clients.model";
export interface skillsInterface extends mongoose.Document{
    name: string;
    endorsments:clientsInterface[];
    used_where: [
        education:string[], 
        certificate:string[],
        experience:string[] 
      ];
}

const skillsSchema = new mongoose.Schema<skillsInterface>({
    name: { type:String, required:true},
    endorsments: [{type: mongoose.Schema.Types.ObjectId, ref:"clients"}],
    used_where: {
        education: { type: [String]},
        certificates: { type: [String]},
        experience: { type: [String]}
      }
})

const skills  = mongoose.model<skillsInterface>('skills',skillsSchema);
export default skills