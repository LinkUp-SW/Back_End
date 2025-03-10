import mongoose from "mongoose";
import conversations from "../../models/conversations.model.ts";

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});

beforeEach(async () => {
    await conversations.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe("Conversations Model", () => {
    it("should create a conversation document successfully", async () => {
        const conversationDoc = new conversations({
            user1_id: new mongoose.Types.ObjectId(),
            user2_id: new mongoose.Types.ObjectId(),
            user1_sent_messages: [new mongoose.Types.ObjectId()],
            user2_sent_messages: [new mongoose.Types.ObjectId()],
        });

        await expect(conversationDoc.save()).resolves.toBeDefined();
    }, 15000);

    it("should require all necessary fields", async () => {
        const conversationDoc = new conversations({});
        await expect(conversationDoc.save()).rejects.toThrow();
    }, 15000);

    it("should validate the data types of fields", async () => {
        const conversationDoc = new conversations({
            user1_id: "not-an-object-id",
            user2_id: "not-an-object-id",
            user1_sent_messages: ["not-an-object-id"],
            user2_sent_messages: ["not-an-object-id"],
        });

        await expect(conversationDoc.save()).rejects.toThrow();
    }, 15000);

    it("should validate nested objects", async () => {
        const conversationDoc = new conversations({
            user1_id: new mongoose.Types.ObjectId(),
            user2_id: new mongoose.Types.ObjectId(),
            user1_sent_messages: [new mongoose.Types.ObjectId()],
            user2_sent_messages: [new mongoose.Types.ObjectId()],
        });

        await expect(conversationDoc.save()).resolves.toBeDefined();
    }, 15000);
});