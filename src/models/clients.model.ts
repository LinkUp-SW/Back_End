import mongoose, { Schema } from "mongoose";
import { bioInterface } from "./bio.model.ts";
import { educationsInterface } from "./educations.model.ts";
import { experiencesInterface } from "./experiences.model.ts";
import { skillsInterface } from "./skills.model.ts";
import { privacySettingsInterface } from "./privacy_settings.model.ts";
import { licenseAndCertificationsInterface } from "./license_and_certifications.model.ts";
import { conversationsInterface } from "./conversations.model.ts";
import { activityInterface } from "./activity.model.ts";
import { jobsInterface } from "./jobs.model.ts";
import { reactsInterface } from "./reactions.model.ts";
import bcrypt from "bcrypt";


export enum sexEnum{
    male="Male",
    female="Female"
}
export enum statusEnum {
    finding_new_job = "Finding a new job",
    hiring = "Hiring",
    providing_services = "Providing services",
    finding_volunteer_opportunities = "Finding volunteer opportunities"
  }
export interface clientsInterface extends mongoose.Document{
  name: string;
  email: string;
  password: string;
  phone_number: number;
  country_code: string;
  comparePassword: (password: string) => Promise<boolean>;
  bio: bioInterface;
  education: educationsInterface[];
  work_experience: experiencesInterface[];
  skills: skillsInterface[];
  liscence_certificates: licenseAndCertificationsInterface[];
  industry: string;
  profile_photo: string;
  cover_photo: string;
  resume: string;
  connections: clientsInterface[];
  followers: clientsInterface[];
  following: clientsInterface[];
  privacy_settings: privacySettingsInterface;
  activity:activityInterface[]
  status: statusEnum; 
  blocked: clientsInterface[];
  conversations: conversationsInterface[];
  notification: {
      seen : boolean,
      user_id :string,
      sender_user_id:string,
      conversation_id:string,
      post_id:string,
      comment_id:string,
      react:reactsInterface
  }[];
  applied_jobs: jobsInterface[];
  saved_jobs: jobsInterface[];
  sex: sexEnum;
  subscription:{
          subscribed: Boolean,
          subscription_started_at:Date
  };
  is_student: boolean;
  is_verified: boolean;
  is_16_or_above: boolean;
}

const clientsSchema = new mongoose.Schema<clientsInterface>({
  name: {type: String}, // removed name from bein required due to signing up with google or email
  email: { 
      type: String, 
      required: true, 
      unique: true, 
      validate: {
          validator: function(v: string) {
              return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
          },
          message: props => `${props.value} is not a valid email!`
      }
  },
  password: { type: String, required: true},
  phone_number: { type: Number},
  country_code: { type: String }, 
  bio: { type: Schema.Types.ObjectId, ref: "bio" },
  education: [{ type: Schema.Types.ObjectId, ref: "educations" }],
  work_experience: [{ type: Schema.Types.ObjectId, ref: "experiences" }],
  skills: [{ type: Schema.Types.ObjectId, ref: "skills" }],
  liscence_certificates: [{ type: Schema.Types.ObjectId, ref: "licenseAndCertifications" }],
  industry: { type: String},
  profile_photo: { type: String },
  cover_photo: { type: String },
  resume: { type: String },
  connections: [{ type: Schema.Types.ObjectId, ref: "clients" }],
  followers: [{ type: Schema.Types.ObjectId, ref: "clients" }],
  following: [{ type: Schema.Types.ObjectId, ref: "clients" }],
  privacy_settings: { type: Schema.Types.ObjectId, ref: "privacy_settings" },
  activity: [{ type: Schema.Types.ObjectId, ref: "activity" }],
  status: { type: String, enum: Object.values(statusEnum), required: true },
  blocked: [{ type: Schema.Types.ObjectId, ref: "clients" }],
  conversations: [{ type: Schema.Types.ObjectId, ref: "skills" }],
  notification: [
      {
        seen: { type: Boolean},
        user_id: { type: String},
        sender_user_id: { type: String},
        conversation_id: { type: String},
        post_id: { type: String},
        comment_id: { type: String},
        react: { type: Schema.Types.ObjectId, ref: "reacts" },
      },
    ],
  applied_jobs:[{ type: Schema.Types.ObjectId, ref: "jobs" }],
  saved_jobs:[{ type: Schema.Types.ObjectId, ref: "jobs" }],
  sex: { type: String, enum: Object.values(sexEnum), required: true },
  subscription: {
      subscribed: { type: Boolean },
      subscription_started_at: { type: Date },
    },
  is_student: { type: Boolean, required: true },
  is_verified: { type: Boolean, required: true },
  is_16_or_above: { type: Boolean, required: true }
});

clientsSchema.pre('save', async function(next) {
    const user = this as clientsInterface;
    if (!user.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        next();
    } catch (err:any) {
        next(err);
    }
});

clientsSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
}

const clients = mongoose.model<clientsInterface>('clients',clientsSchema);
export default clients