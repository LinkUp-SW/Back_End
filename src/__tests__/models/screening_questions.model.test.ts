import mongoose from "mongoose";
import screeningQuestions from "../../models/screening_questions.model.ts";

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe("Screening Questions Model Test", () => {
    it("should create & save a screening question successfully", async () => {
        const validQuestion = new screeningQuestions({
            questions: "What is your experience level?",
            answers: ["Beginner", "Intermediate", "Expert"],
            ideal_answer: "Expert",
            is_must_qualification: true,
            rejection_message: "We are looking for experienced candidates.",
            is_filtererd: false
        });

        const savedQuestion = await validQuestion.save();
        expect(savedQuestion._id).toBeDefined();
        expect(savedQuestion.questions).toBe("What is your experience level?");
    });

    it("should fail if required fields are missing", async () => {
        const questionWithoutRequiredFields = new screeningQuestions({});
        let err;
        try {
            await questionWithoutRequiredFields.save();
        } catch (error) {
            err = error;
        }
        expect(err).toBeDefined();
    });
});
