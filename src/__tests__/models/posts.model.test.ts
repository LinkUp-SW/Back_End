import mongoose from "mongoose";
import posts, { commentsEnum } from "../../models/posts.model.ts";


beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});

beforeEach(async () => {
    await posts.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe("Posts Model", () => {
    it("should create a posts document successfully", async () => {
        const postDoc = new posts({
            user_id: new mongoose.Types.ObjectId(),
            content: "This is a test post",
            date: new Date(),
            media: new mongoose.Types.ObjectId(),
            comments_disabled: commentsEnum.anyone,
            visibility: true,
            reacts: [new mongoose.Types.ObjectId()],
            tagged_users: [new mongoose.Types.ObjectId()],
            comments: [new mongoose.Types.ObjectId()]
        });

        await expect(postDoc.save()).resolves.toBeDefined();
    }, 15000);

    it("should require all necessary fields", async () => {
        const postDoc = new posts({});
        await expect(postDoc.save()).rejects.toThrow();
    }, 15000);

    it("should validate the data types of fields", async () => {
        const postDoc = new posts({
            user_id: "not-an-object-id",
            content: 123,
            date: "not-a-date",
            media: "not-an-object-id",
            comments_disabled: "not-a-valid-enum",
            visibility: "not-a-boolean",
            reacts: ["not-an-object-id"],
            tagged_users: ["not-an-object-id"],
            comments: ["not-an-object-id"]
        });

        await expect(postDoc.save()).rejects.toThrow();
    }, 15000);

    it("should validate the enum values for comments_disabled", async () => {
        const postDoc = new posts({
            user_id: new mongoose.Types.ObjectId(),
            content: "This is a test post",
            date: new Date(),
            media: new mongoose.Types.ObjectId(),
            comments_disabled: "invalid-enum-value",
            visibility: true,
            reacts: [new mongoose.Types.ObjectId()],
            tagged_users: [new mongoose.Types.ObjectId()],
            comments: [new mongoose.Types.ObjectId()]
        });

        await expect(postDoc.save()).rejects.toThrow();
    }, 15000);

    it("should create a post document with default values for optional fields", async () => {
        const postDoc = new posts({
            user_id: new mongoose.Types.ObjectId(),
            content: "This is a test post",
            comments_disabled: commentsEnum.anyone
        });

        await expect(postDoc.save()).resolves.toBeDefined();
        expect(postDoc.date).toBeDefined();
        expect(postDoc.public_post).toBe(true);
    }, 15000);
});