import mongoose, { Schema } from "mongoose";


export interface screeningQuestionsInterface extends mongoose.Document{
    questions: string;
    answers: string[];
    ideal_answer: string;
    is_must_qualification:boolean;
    rejection_message?: string;
    is_filtererd: boolean;
}

const screeningQuestionsSchema = new Schema<screeningQuestionsInterface>({
    questions: { type: String, required: true },
    answers: [{ type: String, required: true }],
    ideal_answer: { type: String, required: true },
    is_must_qualification: { type: Boolean, required: true },
    rejection_message: { type: String},
    is_filtererd: { type: Boolean, required: true }
})

const screeningQuestions = mongoose.model<screeningQuestionsInterface>('screeningQuestions',screeningQuestionsSchema);
export default screeningQuestions;