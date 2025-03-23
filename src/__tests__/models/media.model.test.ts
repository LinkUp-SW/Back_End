import mongoose from "mongoose";
import media from "../../models_to_delete/media.model.ts";

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe("Media Model Test", () => {
    it("should create a media document with valid URLs", async () => {
      const validMedia = new media({
        image: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
        video: ["https://example.com/video1.mp4", "https://example.com/video2.mp4"]
      });
      const savedMedia = await validMedia.save();
      expect(savedMedia._id).toBeDefined();
      expect(savedMedia.image).toHaveLength(2);
      expect(savedMedia.video).toHaveLength(2);
    });
  
    it("should fail to create a media document with invalid URLs", async () => {
      const invalidMedia = new media({
        image: ["invalid-url", "https://example.com/image2.jpg"],
        video: ["https://example.com/video1.mp4", "invalid-url"]
      });
      let err: any;
      try {
        await invalidMedia.save();
      } catch (error) {
        err = error;
      }
      expect(err).toBeDefined();
      expect(err.errors["image"].message).toBe("All image values must be valid URLs");
      expect(err.errors["video"].message).toBe("All video values must be valid URLs");
    });
  });
