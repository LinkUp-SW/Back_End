import mongoose from "mongoose";
import reacts, { reactsEnum } from "../../models_to_delete/reactions.model.ts";

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});

beforeEach(async () => {
    await reacts.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe("Reacts Model", () => {
    it("should create a reacts document successfully", async () => {
        const reactDoc = new reacts({
            user_id: new mongoose.Types.ObjectId(),
            reaction: reactsEnum.laugh
        });

        await expect(reactDoc.save()).resolves.toBeDefined();
    }, 15000);

    it("should require all necessary fields", async () => {
        const reactDoc = new reacts({});
        await expect(reactDoc.save()).rejects.toThrow();
    }, 15000);

    it("should validate the data types of fields", async () => {
        const reactDoc = new reacts({
            user_id: "not-an-object-id",
            reaction: 123
        });

        await expect(reactDoc.save()).rejects.toThrow();
    }, 15000);

    it("should validate the user_id data type", async () => {
        const reactDoc = new reacts({
            user_id: "not-an-object-id",
            reaction: reactsEnum.laugh
        });
        await expect(reactDoc.save()).rejects.toThrow();
    }, 15000);
        
    it("should validate the enum values for reaction", async () => {
        const reactDoc = new reacts({
            user_id: new mongoose.Types.ObjectId(),
            reaction: "invalid-enum-value"
        });

        await expect(reactDoc.save()).rejects.toThrow();
    }, 15000);
});