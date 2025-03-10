import mongoose from "mongoose";
import jobApplications from "../../models/job_applications.model.ts";

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});

beforeEach(async () => {
    await jobApplications.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe("Job Applications Model", () => {
    it("should create a job application document successfully", async () => {
        const jobApplicationDoc = new jobApplications({
            job_id: new mongoose.Types.ObjectId(),
            user_id: new mongoose.Types.ObjectId(),
            first_name: "John",
            last_name: "Doe",
            email_address: "john.doe@example.com",
            phone_number: 1234567890,
            country_code: "US",
            resume: "Resume content",
            questions_responses: ["Response 1", "Response 2"],
            application_status: "Pending",
        });

        await expect(jobApplicationDoc.save()).resolves.toBeDefined();
    }, 15000);

    it("should require all necessary fields", async () => {
        const jobApplicationDoc = new jobApplications({});
        await expect(jobApplicationDoc.save()).rejects.toThrow();
    }, 15000);

    it("should validate the data types of fields", async () => {
        const jobApplicationDoc = new jobApplications({
            job_id: "not-an-object-id",
            user_id: "not-an-object-id",
            first_name: 123,
            last_name: 456,
            email_address: "not-an-email",
            phone_number: "not-a-number",
            country_code: 789,
            resume: 101112,
            questions_responses: [131415],
            application_status: 161718,
        });

        await expect(jobApplicationDoc.save()).rejects.toThrow();
    }, 15000);

    it("should validate the email format", async () => {
        const jobApplicationDoc = new jobApplications({
            job_id: new mongoose.Types.ObjectId(),
            user_id: new mongoose.Types.ObjectId(),
            first_name: "John",
            last_name: "Doe",
            email_address: "invalid-email",
            phone_number: 1234567890,
            country_code: "US",
            resume: "Resume content",
            questions_responses: ["Response 1", "Response 2"],
            application_status: "Pending",
        });

        await expect(jobApplicationDoc.save()).rejects.toThrow();
    }, 15000);
});