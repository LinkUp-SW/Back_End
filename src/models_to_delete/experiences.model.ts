import mongoose, { Schema } from "mongoose";
import { organizationsInterface } from "./organizations.model.ts";



export interface experiencesInterface extends mongoose.Document{
    title: string;
    employee_type:string;
    organization:organizationsInterface | string;
    is_current: boolean;
    start_date: Date;
    end_date: Date; 
    location: string;
    description: string;
    location_type: string;
    skills: string[];   
    media: [{
      media: string,
      title: string,
      description: string
    }]; 
}

const experiencesSchema = new Schema<experiencesInterface>({
    title: {type: String, required:true},
    employee_type: {type: String},
    organization:  {
        type: Schema.Types.Mixed,
        required: true,
        validate: {
          validator: function (value) {
            return typeof value === "string" || mongoose.isValidObjectId(value);
          },
          message: "organization must be either an ObjectId or a string",
        },
        ref: "organizations",
      },
    is_current: {type: Boolean, required:true},
    start_date: {type: Date, required:true},
    end_date: {type:Date},
    location: {type: String},
    description: {type: String},
    location_type: {type: String},
    skills: [{type: String}],
    media: [{
      media: String,
      title: String,
      description: String
    }]    
});

const experiences = mongoose.model<experiencesInterface>('experiences',experiencesSchema);
export default experiences
