import mongoose, { Schema } from "mongoose";
import { skillsInterface } from "./skills.model";
import { mediaInterface } from "./media.model";


export interface educationsInterface extends mongoose.Document{
    school: object;
    degree: string;
    field_of_study: string;
    start_date: Date;
    end_date: Date;
    grade: string;
    activites_and_socials: string;
    Skills: skillsInterface[];
    media: mediaInterface;
    description: string;
}


const educationsSchema = new Schema<educationsInterface>({
    school: {type: Object, required:true},
    degree: {type: String, required:true},
    field_of_study: {type: String, required:true},
    start_date: {type: Date, required:true},
    end_date: {type:Date},
    grade: {type: String, required:true},
    activites_and_socials: {type: String, required:true},
    Skills: [{type:Schema.Types.ObjectId,ref:"skills"}],
    media: {type:Schema.Types.ObjectId,ref:"media"},
    description: {type: String, required:true}
});

const educations = mongoose.model<educationsInterface>('educations',educationsSchema);
export default educations