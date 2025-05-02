import { Schema, model, Types, Document } from 'mongoose';
import { usersInterface } from './users.model.ts';

/** ──────────────────────────────────────────────────────────
 *  Enumerations                                             
 *  (Put them in a shared `types` folder if you like)        
 *  ────────────────────────────────────────────────────────── */
export enum reportReasonEnum{
    spam = "spam",
    harassment= "harassment",
    nudity= "nudity",
    hate_speech= "hate speech",
    scam= "scam",
    other= "other",
}
export enum reportStatusEnum{
    pending='pending',
    resolved='resolved'
}

export enum adminActionEnum {
    none='none',
    dismissed='dismissed',
    content_removed='content removed',
    user_banned='user banned'
}

/* use a dynamic refPath (see `contentRef` + `contentType`) */
export enum contentTypeEnum{
    Post='Post',
    Comment='Comment',
    Job='Job'
}


export interface reportInterface extends Document {
  reporter: usersInterface;      // ref: 'User'
  content_ref: Types.ObjectId;    // dynamic ref to Post / Comment / Job
  content_type: contentTypeEnum;
  reason: reportReasonEnum;
  status: reportStatusEnum;
  admin_action: adminActionEnum;
  created_at: number;
  resolved_by?: usersInterface;   // ref: 'User' (admin)
  resolved_at?: number;
}

/** ──────────────────────────────────────────────────────────
 *  Schema                                                  
 *  ────────────────────────────────────────────────────────── */
const ReportSchema = new Schema<reportInterface>(
  {
    reporter: { type: Types.ObjectId, ref: 'users', required: true },

    /** Dynamic reference so one collection works for posts, comments, jobs */
    content_ref: {
      type: Schema.Types.ObjectId
    },
    content_type: {
      type: String,
      enum: Object.values(contentTypeEnum)
    },

    reason: {
      type: String,
      enum: Object.values(reportReasonEnum),
    },

    /* Admin-side fields */
    status: { type: String, enum: Object.values(reportStatusEnum), default:reportStatusEnum.pending },
    admin_action: {
      type: String,
      enum: Object.values(adminActionEnum)
    },
    created_at:{ 
        type: Number, 
        default: () => Math.floor(Date.now() / 1000)
    },
    resolved_by: { type: Types.ObjectId, ref: 'users' },
    resolved_at: Number,
  }
);

// indexing
ReportSchema.index({ status: 1, createdAt: -1 });                // quick “open reports” list
ReportSchema.index({ contentRef: 1, contentType: 1 });           // find reports for a post

export const Report = model<reportInterface>('Report', ReportSchema);
