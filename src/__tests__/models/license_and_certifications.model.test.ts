import mongoose from "mongoose";
import LicenseAndCertifications from "../../models/license_and_certifications.model";
import Skills from "../../models/skills.model";
import companies, { companySizeEnum, companyTypeEnum } from "../../models/companies.model";

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
        const company = await companies.create({
            company_name: "Amazon",
            unique_url: "https://aws.amazon.com",
            industry: "Technology",
            size: companySizeEnum.enterprise_10000_plus,
            type: companyTypeEnum.public_company
        });
        const license = await LicenseAndCertifications.create({
            name: "AWS Certified Developer",
            issuing_organization: company,
            issue_date: new Date("2022-01-01"),
            expiration_date: new Date("2024-01-01"),
            credintial_id: 123456,
            credintial_url: "https://aws.amazon.com/certification/",
            skills: [skill._id]
        });
        expect(license.name).toBe("AWS Certified Developer");
        expect(license.issuing_organization._id).toBe(company._id);
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
