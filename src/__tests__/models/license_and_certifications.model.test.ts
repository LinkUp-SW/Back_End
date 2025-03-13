import mongoose from "mongoose";
import LicenseAndCertifications from "../../models/license_and_certifications.model.ts";
import Skills from "../../models/skills.model.ts";
import organizations, { organizationSizeEnum, organizationTypeEnum } from "../../models/organizations.model.ts";

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});
describe("License and Certifications Model", () => {

    it("should create a license and certification successfully", async () => {
        const skill = await Skills.create({ name: "JavaScript" });
        const license = await LicenseAndCertifications.create({
            name: "AWS Certified Developer",
            issuing_organization: new mongoose.Types.ObjectId(),
            issue_date: new Date("2022-01-01"),
            expiration_date: new Date("2024-01-01"),
            credintial_id: 123456,
            credintial_url: "https://aws.amazon.com/certification/",
            skills: [skill._id]
        });
        expect(license.name).toBe("AWS Certified Developer");
        expect(license.skills.length).toBe(1);
    });

    it("should require a name field", async () => {
        try {
            await LicenseAndCertifications.create({ issuing_organization: "Amazon" });
        } catch (error: any) {
            expect(error.errors.name).toBeDefined();
        }
    });
});
