import mongoose from "mongoose";
import educations from "../../models/educations.model";


beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe("Educations Model Test", () => {
    it("create & save education successfully", async () => {
        const validEducation = new educations({
            school: new mongoose.Types.ObjectId(),
            degree: "Bachelor of Science",
            field_of_study: "Computer Science",
            start_date: new Date("2015-09-01"),
            end_date: new Date("2019-06-01"),
            grade: "A",
            activites_and_socials: "Coding Club",
            skills: [new mongoose.Types.ObjectId()],
            media: new mongoose.Types.ObjectId(),
            description: "Studied various computer science subjects.",
        });
        const savedEducation = await validEducation.save();
        expect(savedEducation._id).toBeDefined();
        expect(savedEducation.degree).toBe(validEducation.degree);
        expect(savedEducation.field_of_study).toBe(validEducation.field_of_study);
    });

    it("insert education successfully, but the field not defined in schema should be undefined", async () => {
        const educationWithInvalidField = new educations({
            school: new mongoose.Types.ObjectId(),
            degree: "Bachelor of Science",
            field_of_study: "Computer Science",
            start_date: new Date("2015-09-01"),
            end_date: new Date("2019-06-01"),
            grade: "A",
            activites_and_socials: "Coding Club",
            skills: [new mongoose.Types.ObjectId()],
            media: new mongoose.Types.ObjectId(),
            description: "Studied various computer science subjects.",
            extraField: "This field is not defined in schema",
        });
        const savedEducationWithInvalidField = await educationWithInvalidField.save();
        expect(savedEducationWithInvalidField._id).toBeDefined();
        expect((savedEducationWithInvalidField as any).extraField).toBeUndefined();
    });

    it("create education without required field should fail", async () => {
        const educationWithoutRequiredField = new educations({
            degree: "Bachelor of Science",
        });
        let err;
        try {
            const savedEducationWithoutRequiredField = await educationWithoutRequiredField.save();
            err = savedEducationWithoutRequiredField;
        } catch (error) {
            err = error;
        }
        expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
        if (err instanceof mongoose.Error.ValidationError) {
            expect(err.errors.school).toBeDefined();
        }
    });
});
