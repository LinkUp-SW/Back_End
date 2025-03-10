import mongoose from "mongoose";
import media from "../../models/media.model.ts";

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe("Media Model", () => {
    it("should create a media document successfully", async () => {
        const newMedia = new media({
            image: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
            video: ["https://example.com/video.mp4"]
        });

        const savedMedia = await newMedia.save();
        expect(savedMedia._id).toBeDefined();
        expect(savedMedia.image).toHaveLength(2);
        expect(savedMedia.video).toHaveLength(1);
    });

    it("should allow empty image and video arrays", async () => {
        const emptyMedia = new media({
            image: [],
            video: []
        });

        const savedMedia = await emptyMedia.save();
        expect(savedMedia._id).toBeDefined();
        expect(savedMedia.image).toEqual([]);
        expect(savedMedia.video).toEqual([]);
    });

    it("should fail if non-string values are added to image or video arrays", async () => {
        const invalidMedia = new media({
            image: [123, "https://example.com/image.jpg"],
            video: [true, "https://example.com/video.mp4"]
        });

        await expect(invalidMedia.save()).rejects.toThrow();
    });
});
