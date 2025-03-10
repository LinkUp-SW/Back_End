import mongoose from "mongoose";
import reposts from "../../models/reposts.model";

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});

beforeEach(async () => {
    await reposts.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});


describe("Reposts Model Test", () => {
    it("should create and save a repost successfully", async () => {
        const validRepost = new reposts({
            post_id: new mongoose.Types.ObjectId(),
            user_id: new mongoose.Types.ObjectId(),
            content: "This is a repost content",
        });
        const savedRepost = await validRepost.save();
        expect(savedRepost._id).toBeDefined();
        expect(savedRepost.post_id).toBe(validRepost.post_id);
        expect(savedRepost.user_id).toBe(validRepost.user_id);
        expect(savedRepost.content).toBe(validRepost.content);
    });

    it("should fail to create a repost without required fields", async () => {
        const invalidRepost = new reposts({
            content: "This is a repost content",
        });
        let err;
        try {
            await invalidRepost.save();
        } catch (error) {
            err = error;
        }
        expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
        if (err instanceof mongoose.Error.ValidationError) {
            expect(err.errors.post_id).toBeDefined();
            expect(err.errors.user_id).toBeDefined();
        }
    });
});