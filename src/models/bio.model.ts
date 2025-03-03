import mongoose, { Schema } from "mongoose";
import { experiencesInterface } from "./experiences.model";
import { educationsInterface } from "./educations.model";



export interface bioInterface extends mongoose.Document{
    first_name:string;
    last_name:string;
    headline:string;
    experience:experiencesInterface[];
    education:educationsInterface[];
    contact_info:{
        phone_number: string;
        phone_type: string;
        address: string;
        birthday: Date;
        website: string;
    };
    website:string;
    location:{
        country_region: string;
        city: string;
    };
}

const bioSchema = new Schema<bioInterface>({
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    headline: { type: String, required: true },
    experience: [{ type: Schema.Types.ObjectId, ref: "experiences" }],
    education: [{ type: Schema.Types.ObjectId, ref: "educations" }],
    contact_info:{
        phone_number: { type: String, required: true },
        phone_type: { type: String, required: true },
        address: { type: String, required: true },
        birthday: {type: Date, required:true},
        website: { type: String, required: true },
    },
    location: {
        country_region: { type: String, required: true },
        city: { type: String, required: true }
    }
});

const bio = mongoose.model<bioInterface>('bio',bioSchema);
export default bio