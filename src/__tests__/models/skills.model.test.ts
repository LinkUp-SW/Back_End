import mongoose from "mongoose";
import skills from "../../models/skills.model";
beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI || "");
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe("Skills Model", () => {
  it("should create a skill successfully", async () => {
    const skill = new skills({
      name: "JavaScript",
      endorsments: [new mongoose.Types.ObjectId()],
      used_where: {
        educations: [new mongoose.Types.ObjectId()],
        certificates: [new mongoose.Types.ObjectId()],
        experience: [new mongoose.Types.ObjectId()],
      },
    });

    await expect(skill.save()).resolves.toBeDefined();
  });

  it("should not create a skill without a name", async () => {
    const skill = new skills({
      endorsments: [new mongoose.Types.ObjectId()],
      used_where: {
        educations: [new mongoose.Types.ObjectId()],
        certificates: [new mongoose.Types.ObjectId()],
        experience: [new mongoose.Types.ObjectId()],
      },
    });

    await expect(skill.save()).rejects.toThrow();
  });

  
});