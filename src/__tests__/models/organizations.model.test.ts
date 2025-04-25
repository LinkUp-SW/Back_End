import mongoose from 'mongoose';
import organizations, { organizationSizeEnum, organizationTypeEnum, categoryTypeEnum } from '../../models/organizations.model.ts';

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});

beforeEach(async () => {
    await organizations.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe('organizations Model Test', () => {
    it('should create and save a organization successfully', async () => {
        const validorganization = new organizations({
            organization_name: 'Test organization',
            category_type: categoryTypeEnum.company,
            unique_url: 'test-organization',
            website: 'http://testorganization.com',
            logo: 'http://testorganization.com/logo.png',
            description: 'A test organization',
            industry: 'Software',
            location: 'Test City',
            size: organizationSizeEnum.small_1_10,
            type: organizationTypeEnum.Public_organization,
            posts: [],
            followers: [],
            blocked: [],
            conversations: [],
            admins: []
        });
        const savedorganization = await validorganization.save();
        expect(savedorganization._id).toBeDefined();
        expect(savedorganization.name).toBe(validorganization.name);
        expect(savedorganization.category_type).toBe(validorganization.category_type);
        expect(savedorganization.website).toBe(validorganization.website);
        expect(savedorganization.logo).toBe(validorganization.logo);
        expect(savedorganization.description).toBe(validorganization.description);
        expect(savedorganization.industry).toBe(validorganization.industry);
        expect(savedorganization.location).toBe(validorganization.location);
        expect(savedorganization.size).toBe(validorganization.size);
        expect(savedorganization.type).toBe(validorganization.type);
    });

    it('should fail to create a organization without required fields', async () => {
        const invalidorganization = new organizations({
            website: 'http://testorganization.com',
            logo: 'http://testorganization.com/logo.png',
            description: 'A test organization',
            industry: 'Software',
            location: 'Test City',
            size: organizationSizeEnum.small_1_10,
            type: organizationTypeEnum.Public_organization,
            posts: [],
            followers: [],
            blocked: [],
            conversations: [],
            admins: []
        });
        let err;
        try {
            const savedorganization = await invalidorganization.save();
            err = savedorganization;
        } catch (error) {
            err = error;
        }
        expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
        if (err instanceof mongoose.Error.ValidationError) {
            expect(err.errors.organization_name).toBeDefined();
            expect(err.errors.category_type).toBeDefined();
            expect(err.errors.unique_url).toBeDefined();
        }
    });
});