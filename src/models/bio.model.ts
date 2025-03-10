import mongoose, { Schema } from "mongoose";
import { experiencesInterface } from "./experiences.model.ts";
import { educationsInterface } from "./educations.model.ts";



export interface bioInterface extends mongoose.Document{
    first_name:string;
    last_name:string;
    headline:string;
    experience:experiencesInterface[];
    education:educationsInterface[];
    contact_info:{
        phone_number: number;
        country_code: string;
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
    headline: { type: String},
    experience: [{ type: Schema.Types.ObjectId, ref: "experiences" }],
    education: [{ type: Schema.Types.ObjectId, ref: "educations" }],
    contact_info:{
        phone_number: { type: Number, required: true },
        country_code: { type: String, required: true },
        phone_type: { type: String, required: true },
        address: { type: String, required: true },
        birthday: {type: Date, required:true},
        website: { type: String},
    },
    location: {
        country_region: { type: String },
        city: { type: String }
    }
});

const bio = mongoose.model<bioInterface>('bio',bioSchema);
export default bio