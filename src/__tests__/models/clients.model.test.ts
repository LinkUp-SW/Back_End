import mongoose from "mongoose";
import clients from "../../models/clients.model.ts";

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI || "");
});

beforeEach(async () => {
  await clients.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe("Clients Model", () => {
  it("should create a client document successfully", async () => {
    const clientDoc = new clients({
      client_id: new mongoose.Types.ObjectId(),
      bio: new mongoose.Types.ObjectId(),
      education: [new mongoose.Types.ObjectId()],
      work_experience: [new mongoose.Types.ObjectId()],
      skills: [new mongoose.Types.ObjectId()],
      liscence_certificates: [new mongoose.Types.ObjectId()],
      industry: "Software",
      profile_photo: "profile.jpg",
      cover_photo: "cover.jpg",
      resume: "resume.pdf",
      connections: [new mongoose.Types.ObjectId()],
      followers: [new mongoose.Types.ObjectId()],
      following: [new mongoose.Types.ObjectId()],
      privacy_settings: new mongoose.Types.ObjectId(),
      activity: [new mongoose.Types.ObjectId()],
      status: "Finding a new job",
      blocked: [new mongoose.Types.ObjectId()],
      conversations: [new mongoose.Types.ObjectId()],
      notification: [
        {
          seen: true,
          user_id: "user123",
          sender_user_id: "user456",
          conversation_id: "conv123",
          post_id: "post123",
          comment_id: "comment123",
          react: new mongoose.Types.ObjectId(),
        },
      ],
      applied_jobs: [new mongoose.Types.ObjectId()],
      saved_jobs: [new mongoose.Types.ObjectId()],
      sex: "Male",
      subscription: {
        subscribed: true,
        subscription_started_at: new Date(),
      },
      is_student: true,
      is_verified: true,
      is_16_or_above: true,
    });

    await expect(clientDoc.save()).resolves.toBeDefined();
  }, 15000);

  it("should require all necessary fields", async () => {
    const clientDoc = new clients({});
    await expect(clientDoc.save()).rejects.toThrow();
  }, 15000);

  it("should validate the data types of fields", async () => {
    const clientDoc = new clients({
      client_id: "not-an-object-id",
      bio: "not-an-object-id",
      education: ["not-an-object-id"],
      work_experience: ["not-an-object-id"],
      skills: ["not-an-object-id"],
      liscence_certificates: ["not-an-object-id"],
      industry: 123,
      profile_photo: 123,
      cover_photo: 123,
      resume: 123,
      connections: ["not-an-object-id"],
      followers: ["not-an-object-id"],
      following: ["not-an-object-id"],
      privacy_settings: "not-an-object-id",
      activity: ["not-an-object-id"],
      status: 123,
      blocked: ["not-an-object-id"],
      conversations: ["not-an-object-id"],
      notification: [
        {
          seen: "not-a-boolean",
          user_id: 123,
          sender_user_id: 123,
          conversation_id: 123,
          post_id: 123,
          comment_id: 123,
          react: "not-an-object-id",
        },
      ],
      applied_jobs: ["not-an-object-id"],
      saved_jobs: ["not-an-object-id"],
      sex: 123,
      subscription: {
        subscribed: "not-a-boolean",
        subscription_started_at: "not-a-date",
      },
      is_student: "not-a-boolean",
      is_verified: "not-a-boolean",
      is_16_or_above: "not-a-boolean",
    });

    await expect(clientDoc.save()).rejects.toThrow();
  }, 15000);

  it("should validate nested objects", async () => {
    const clientDoc = new clients({
      client_id: new mongoose.Types.ObjectId(),
      bio: new mongoose.Types.ObjectId(),
      education: [new mongoose.Types.ObjectId()],
      work_experience: [new mongoose.Types.ObjectId()],
      skills: [new mongoose.Types.ObjectId()],
      liscence_certificates: [new mongoose.Types.ObjectId()],
      industry: "Software",
      profile_photo: "profile.jpg",
      cover_photo: "cover.jpg",
      resume: "resume.pdf",
      connections: [new mongoose.Types.ObjectId()],
      followers: [new mongoose.Types.ObjectId()],
      following: [new mongoose.Types.ObjectId()],
      privacy_settings: new mongoose.Types.ObjectId(),
      activity: [new mongoose.Types.ObjectId()],
      status: "Finding a new job",
      blocked: [new mongoose.Types.ObjectId()],
      conversations: [new mongoose.Types.ObjectId()],
      notification: [
        {
          seen: true,
          user_id: "user123",
          sender_user_id: "user456",
          conversation_id: "conv123",
          post_id: "post123",
          comment_id: "comment123",
          react: new mongoose.Types.ObjectId(),
        },
      ],
      applied_jobs: [new mongoose.Types.ObjectId()],
      saved_jobs: [new mongoose.Types.ObjectId()],
      sex: "Male",
      subscription: {
        subscribed: true,
        subscription_started_at: new Date(),
      },
      is_student: true,
      is_verified: true,
      is_16_or_above: true,
    });

    await expect(clientDoc.save()).resolves.toBeDefined();
  }, 15000);
});