import mongoose from "mongoose";
import messages from "../../models_to_delete/messages.model.ts";
import { reactsEnum } from "../../models_to_delete/reactions.model.ts";

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});

beforeEach(async () => {
    await messages.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe("Messages Model", () => {
    it("should create a messages document successfully", async () => {
        const messageDoc = new messages({
            content: [{ message: "Hello World", media:new mongoose.Types.ObjectId() }],
            timestamp: new Date(),
            is_seen: true,
            reactions: [reactsEnum.cry,reactsEnum.love]
        });

        await expect(messageDoc.save()).resolves.toBeDefined();
    }, 15000);

    it("should require all necessary fields", async () => {
        const messageDoc = new messages({});
        await expect(messageDoc.save()).rejects.toThrow();
    }, 15000);

    it("should validate the data types of fields", async () => {
        const messageDoc = new messages({
            content: [{ message: 123, media: "not-an-object-id" }],
            timestamp: "not-a-date",
            is_seen: "not-a-boolean",
            reactions: [123]
        });

        await expect(messageDoc.save()).rejects.toThrow();
    }, 15000);

    it("should validate the enum values for reactions", async () => {
        const messageDoc = new messages({
            content: [{ message: "Hello World", media: new mongoose.Types.ObjectId() }],
            timestamp: new Date(),
            is_seen: true,
            reactions: ["invalid-reaction"]
        });

        await expect(messageDoc.save()).rejects.toThrow();
    }, 15000);
});