import mongoose from "mongoose";
import Experiences from "../../models/experiences.model.ts";
import Skills from "../../models/skills.model.ts";
import Media, { mediaInterface } from "../../models/media.model.ts";
import Companies, { companiesInterface, companySizeEnum, companyTypeEnum } from "../../models/companies.model.ts";
import experiences from "../../models/experiences.model.ts";

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});
beforeEach(async () => {
    await experiences.deleteMany({});
});
afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe("Experiences Model", () => {

    it("should create an experience record successfully", async () => {
        const skill = await Skills.create({ name: "Project Management" });
        const experience = await Experiences.create({
            title: "Software Engineer",
            employee_type: "Full-time",
            company: "Google",
            is_current: true,
            start_date: new Date("2021-06-01"),
            location: "California, USA",
            description: "Developed scalable web applications.",
            location_type: "On-site",
            where_did_you_find_us: "LinkedIn",
            skills: [skill._id]
        });
        expect(experience.title).toBe("Software Engineer");
        expect(experience.skills.length).toBe(1);
    });

    it("should require a title field", async () => {
        try {
            await Experiences.create({ company: "Google" });
        } catch (error: any) {
            expect(error.errors.title).toBeDefined();
        }
    });
    
    it("should create an experience with media", async () => {
        const media = await Media.create({ image: ["image1.jpg"], video: ["video1.mp4"] });
        const experience = await Experiences.create({
            title: "Graphic Designer",
            employee_type: "Part-time",
            company: "Adobe",
            is_current: false,
            start_date: new Date("2020-01-01"),
            end_date: new Date("2021-01-01"),
            location: "Remote",
            description: "Designed marketing materials.",
            location_type: "Remote",
            where_did_you_find_us: "Indeed",
            media: media._id
        });
        expect(experience.title).toBe("Graphic Designer");
        expect(experience.media).toBe(media._id);
    });
    
    it("should create an experience with a company reference", async () => {
        const company = await Companies.create({
            company_name: "Microsoft",
            unique_url: "microsoft",
            industry: "Technology",
            size: companySizeEnum.enterprise_10000_plus,
            type: companyTypeEnum.public_company
        });
        const experience = await Experiences.create({
            title: "Product Manager",
            employee_type: "Contract",
            company: company._id,
            is_current: true,
            start_date: new Date("2019-05-01"),
            location: "Washington, USA",
            description: "Managed product lifecycle.",
            location_type: "On-site",
            where_did_you_find_us: "Referral"
        });
        expect(experience.title).toBe("Product Manager");
        // console.log(experience.company);
        // console.log(company._id);
        expect(experience.company).toBe(company._id);
    });
    
    it("should require start_date field", async () => {
        try {
            await Experiences.create({
                title: "Intern",
                employee_type: "Internship",
                company: "Facebook",
                is_current: false,
                location: "California, USA",
                description: "Assisted in software development.",
                location_type: "On-site",
                where_did_you_find_us: "University"
            });
        } catch (error: any) {
            expect(error.errors.start_date).toBeDefined();
        }
    });
});

