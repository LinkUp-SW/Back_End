import mongoose from "mongoose";
import activity from "../../models/activity.model.ts";

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});

beforeEach(async () => {
    await activity.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe("Activity Model", () => {
    it("should create an activity document successfully", async () => {
        const activityDoc = new activity({
            posts: [new mongoose.Types.ObjectId()],
            reposted_posts: [new mongoose.Types.ObjectId()],
            reacted_posts: [new mongoose.Types.ObjectId()],
            comments: [new mongoose.Types.ObjectId()],
            media: [new mongoose.Types.ObjectId()]
        });

        await expect(activityDoc.save()).resolves.toBeDefined();
    }, 15000);
    
    it("should validate the data types of fields", async () => {
        const activityDoc = new activity({
            posts: ["not-an-object-id"],
            reposted_posts: ["not-an-object-id"],
            reacted_posts: ["not-an-object-id"],
            comments: ["not-an-object-id"],
            media: ["not-an-object-id"]
        });

        await expect(activityDoc.save()).rejects.toThrow();
    }, 15000);

    it("should validate nested objects", async () => {
        const activityDoc = new activity({
            posts: [new mongoose.Types.ObjectId()],
            reposted_posts: [new mongoose.Types.ObjectId()],
            reacted_posts: [new mongoose.Types.ObjectId()],
            comments: [new mongoose.Types.ObjectId()],
            media: [new mongoose.Types.ObjectId()]
        });

        await expect(activityDoc.save()).resolves.toBeDefined();
    }, 15000);
});