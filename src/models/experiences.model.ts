import mongoose, { Schema } from "mongoose";
import { skillsInterface } from "./skills.model";
import { mediaInterface } from "./media.model";


export interface experiencesInterface extends mongoose.Document{
    title: string;
    employee_type:string;
    company:Object;
    is_current: boolean;
    start_date: Date;
    end_date: Date;
    location: string;
    description: string;
    location_type: string;
    where_did_you_find_us: string;
    skills: skillsInterface[];
    media: mediaInterface;
}

const experiencesSchema = new Schema<experiencesInterface>({
    title: {type: String, required:true},
    employee_type: {type: String, required:true},
    company: {type:Schema.Types.ObjectId},
    is_current: {type: Boolean, required:true},
    start_date: {type: Date, required:true},
    end_date: {type:Date},
    location: {type: String, required:true},
    description: {type: String, required:true},
    location_type: {type: String, required:true},
    where_did_you_find_us: {type: String, required:true},
    skills: [{type:Schema.Types.ObjectId,ref:"skills"}],
    media: {type:Schema.Types.ObjectId,ref:"media"}
});

const experiences = mongoose.model<experiencesInterface>('experiences',experiencesSchema);
export default experiences

