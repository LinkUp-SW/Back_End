import mongoose, { Schema } from "mongoose";
import { skillsInterface } from "./skills.model.ts";
import { mediaInterface } from "./media.model.ts";
import { companiesInterface } from "./companies.model.ts";


export interface educationsInterface extends mongoose.Document{
    school: companiesInterface;
    degree: string;
    field_of_study: string;
    start_date: Date;
    end_date: Date;
    grade: string;
    activites_and_socials: string;
    skills: skillsInterface[];
    media: mediaInterface;
    description: string;
}


const educationsSchema = new Schema<educationsInterface>({
    school: {type:Schema.Types.ObjectId,ref:"company", required:true},
    degree: {type: String},
    field_of_study: {type: String},
    start_date: {type: Date},
    end_date: {type:Date},
    grade: {type: String},
    activites_and_socials: {type: String},
    skills: [{type:Schema.Types.ObjectId,ref:"skills"}],
    media: {type:Schema.Types.ObjectId,ref:"media"},
    description: {type: String}
});

const educations = mongoose.model<educationsInterface>('educations',educationsSchema);
export default educations