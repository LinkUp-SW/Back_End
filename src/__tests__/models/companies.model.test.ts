import mongoose from 'mongoose';
import companies, { companySizeEnum, companyTypeEnum } from '../../models/companies.model.ts';

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});

beforeEach(async () => {
    await companies.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});


describe('Companies Model Test', () => {
    it('should create and save a company successfully', async () => {
        const validCompany = new companies({
            company_name: 'Test Company',
            unique_url: 'test-company',
            website: 'http://testcompany.com',
            logo: 'http://testcompany.com/logo.png',
            description: 'A test company',
            industry: 'Software',
            location: 'Test City',
            size: companySizeEnum.small_2_10,
            type: companyTypeEnum.public_company,
            posts: [],
            followers: [],
            blocked: [],
            conversations: []
        });
        const savedCompany = await validCompany.save();
        expect(savedCompany._id).toBeDefined();
        expect(savedCompany.company_name).toBe(validCompany.company_name);
        expect(savedCompany.unique_url).toBe(validCompany.unique_url);
        expect(savedCompany.website).toBe(validCompany.website);
        expect(savedCompany.logo).toBe(validCompany.logo);
        expect(savedCompany.description).toBe(validCompany.description);
        expect(savedCompany.industry).toBe(validCompany.industry);
        expect(savedCompany.location).toBe(validCompany.location);
        expect(savedCompany.size).toBe(validCompany.size);
        expect(savedCompany.type).toBe(validCompany.type);
    });

    it('should fail to create a company without required fields', async () => {
        const invalidCompany = new companies({
            website: 'http://testcompany.com',
            logo: 'http://testcompany.com/logo.png',
            description: 'A test company',
            industry: 'Software',
            location: 'Test City',
            size: companySizeEnum.small_2_10,
            type: companyTypeEnum.public_company,
            posts: [],
            followers: [],
            blocked: [],
            conversations: []
        });
        let err;
        try {
            const savedCompany = await invalidCompany.save();
            err = savedCompany;
        } catch (error) {
            err = error;
        }
        expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
        if (err instanceof mongoose.Error.ValidationError) {
            expect(err.errors.company_name).toBeDefined();
            expect(err.errors.unique_url).toBeDefined();
        }
    });
});