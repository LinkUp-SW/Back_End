import mongoose from "mongoose";
import bio from "../../models/bio.model.ts";

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});

beforeEach(async () => {
    await bio.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe("Bio Model", () => {
    it("should create a bio document successfully", async () => {
        const bioDoc = new bio({
            first_name: "John",
            last_name: "Doe",
            headline: "Software Engineer",
            experience: [new mongoose.Types.ObjectId(),new mongoose.Types.ObjectId()],
            education: [new mongoose.Types.ObjectId(),new mongoose.Types.ObjectId()],
            contact_info: {
                phone_number: 1234567890,
                country_code: "+1",
                phone_type: "mobile",
                address: "123 Main St",
                birthday: new Date("1990-01-01"),
                website: "https://johndoe.com",
            },
            website: "https://johndoe.com",
            location: {
                country_region: "USA",
                city: "New York",
            },
        });

        await expect(bioDoc.save()).resolves.toBeDefined();
    }, 15000);

    it("should require all necessary fields", async () => {
        const bioDoc = new bio({});
        await expect(bioDoc.save()).rejects.toThrow();
    }, 15000);

    it("should validate the data types of fields", async () => {
        const bioDoc = new bio({
            first_name: "John",
            last_name: "Doe",
            headline: "Software Engineer",
            experience: [],
            education: [],
            contact_info: {
                phone_number: "not-a-number",
                country_code: "+1",
                phone_type: "mobile",
                address: "123 Main St",
                birthday: "not-a-date",
                website: "https://johndoe.com",
            },
            website: "https://johndoe.com",
            location: {
                country_region: "USA",
                city: "New York",
            },
        });

        await expect(bioDoc.save()).rejects.toThrow();
    }, 15000);

    it("should validate nested objects", async () => {
        const bioDoc = new bio({
            first_name: "John",
            last_name: "Doe",
            headline: "Software Engineer",
            experience: [],
            education: [],
            contact_info: {
                phone_number: 1234567890,
                country_code: "+1",
                phone_type: "mobile",
                address: "123 Main St",
                birthday: new Date("1990-01-01"),
                website: "https://johndoe.com",
            },
            website: "https://johndoe.com",
            location: {
                country_region: "USA",
                city: "New York",
            },
        });

        await expect(bioDoc.save()).resolves.toBeDefined();
    }, 15000);
});