import mongoose from "mongoose";
import comments from "../../models/comments.model";

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});

beforeEach(async () => {
    await comments.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe("Comments Model", () => {
    it("should create a comment document successfully", async () => {
        const commentDoc = new comments({
            post_id: new mongoose.Types.ObjectId(),
            user_id: new mongoose.Types.ObjectId(),
            content: "This is a comment",
            media: new mongoose.Types.ObjectId(),
            reacts: [new mongoose.Types.ObjectId()],
            tagged_users: [new mongoose.Types.ObjectId()],
        });

        await expect(commentDoc.save()).resolves.toBeDefined();
    }, 15000);

    it("should require all necessary fields", async () => {
        const commentDoc = new comments({});
        await expect(commentDoc.save()).rejects.toThrow();
    }, 15000);

    it("should validate the data types of fields", async () => {
        const commentDoc = new comments({
            post_id: 123,
            user_id: 123,
            content: 123,
            date: "not-a-date",
            media: "not-an-object-id",
            reacts: ["not-an-object-id"],
            tagged_users: ["not-an-object-id"],
        });

        await expect(commentDoc.save()).rejects.toThrow();
    }, 15000);

    it("should validate nested objects", async () => {
        const commentDoc = new comments({
            post_id: new mongoose.Types.ObjectId(),
            user_id: new mongoose.Types.ObjectId(),
            content: "This is a comment",
            media: new mongoose.Types.ObjectId(),
            reacts: [new mongoose.Types.ObjectId()],
            tagged_users: [new mongoose.Types.ObjectId()],
        });

        await expect(commentDoc.save()).resolves.toBeDefined();
    }, 15000);
});