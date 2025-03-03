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
    degree: {type: String},
    field_of_study: {type: String},
    start_date: {type: Date},
    end_date: {type:Date},
    grade: {type: String},
    activites_and_socials: {type: String},
    Skills: [{type:Schema.Types.ObjectId,ref:"skills"}],
    media: {type:Schema.Types.ObjectId,ref:"media"},
    description: {type: String}
});

const educations = mongoose.model<educationsInterface>('educations',educationsSchema);
export default educations