import mongoose from 'mongoose';
import jobs, { experienceLevelEnum, jobTypeEnum, receiveApplicantsByEnum, workplaceTypeEnum } from '../../models/jobs.model.ts';

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe('Jobs Model Test', () => {

    it('should create and save a job successfully', async () => {
        const validJob = new jobs({
            organization_id: new mongoose.Types.ObjectId(),
            job_title: 'Software Engineer',
            location: 'Remote',
            job_type: jobTypeEnum.full_time,
            workplace_type: workplaceTypeEnum.hybrid,
            organization_industry: ['Tech'],
            experience_level: experienceLevelEnum.Entry_Level,
            job_description: 'Develop and maintain software applications.',
            targetted_skills: ['JavaScript', 'Node.js'],
            receive_applicants_by: receiveApplicantsByEnum.email,
            receiving_method: 'Email',
            screening_questions: new mongoose.Types.ObjectId(),
            salary: 60000,
            applied_applications: [new mongoose.Types.ObjectId()]
        });
        const savedJob = await validJob.save();
        expect(savedJob._id).toBeDefined();
        expect(savedJob.job_title).toBe('Software Engineer');
    });

    it('should fail to create a job without required fields', async () => {
        const invalidJob = new jobs({
            job_title: 'Software Engineer'
        });
        let err;
        try {
            await invalidJob.save();
        } catch (error) {
            err = error;
        }
        expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
        if (err instanceof mongoose.Error.ValidationError) {
            expect(err.errors.organization_id).toBeDefined();
            expect(err.errors.location).toBeDefined();
        }
    });

    it('should fail to create a job with invalid enum values', async () => {
        const invalidJob = new jobs({
            organization_id: new mongoose.Types.ObjectId(),
            job_title: 'Software Engineer',
            location: 'Remote',
            job_type: 'invalid_type',
            workplace_type: 'invalid_type',
            organization_industry: ['Tech'],
            experience_level: 'invalid_level',
            job_description: 'Develop and maintain software applications.',
            targetted_skills: ['JavaScript', 'Node.js'],
            receive_applicants_by: 'invalid_method',
            receiving_method: 'Email',
            screening_questions: new mongoose.Types.ObjectId(),
            how_did_you_hear_about_us: 'invalid_source',
            salary: 60000,
            applied_applications: [new mongoose.Types.ObjectId()]
        });
        await expect(invalidJob.save()).rejects.toThrow();
    });
});