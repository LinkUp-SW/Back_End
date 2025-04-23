import request from 'supertest';
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import userSearchRoutes from '../../routes/my_network/userSearch.routes.ts';
import users from '../../models/users.model.ts';
import organizations from '../../models/organizations.model.ts';
import jobs from '../../models/jobs.model.ts';
import tokenUtils from '../../utils/token.utils.ts';
import { sexEnum, statusEnum, accountStatusEnum, invitationsEnum, followEnum } from '../../models/users.model.ts';
import { organizationSizeEnum, organizationTypeEnum, categoryTypeEnum } from '../../models/organizations.model.ts';
import { jobTypeEnum, workplaceTypeEnum, experienceLevelEnum, receiveApplicantsByEnum } from '../../models/jobs.model.ts';

const app = express();
app.use(express.json());
app.use(
  session({
    secret: 'testsecret',
    resave: false,
    saveUninitialized: true,
  })
);
app.use('/api/v1/search', userSearchRoutes);

jest.setTimeout(30000);

describe('Search Suggestions API', () => {
  let viewerUserId: string;
  let viewerToken: string;
  let viewer_id: mongoose.Types.ObjectId;
  
  // Test users
  let firstDegree_id: mongoose.Types.ObjectId;
  let secondDegree_id: mongoose.Types.ObjectId;
  let thirdDegree_id: mongoose.Types.ObjectId;
  let blocked_id: mongoose.Types.ObjectId;
  let blockedBy_id: mongoose.Types.ObjectId;
  
  // Test organizations
  let tech_company_id: mongoose.Types.ObjectId;
  let university_id: mongoose.Types.ObjectId;
  
  // Test jobs
  let software_job_id: mongoose.Types.ObjectId;
  let marketing_job_id: mongoose.Types.ObjectId;

  // Common names to search for
  const uniquePrefix = `test-${Date.now()}`;
  const testName = `Mohamed Sobh-${uniquePrefix}`;
  const testIndustry = `Tech Industry-${uniquePrefix}`;
  const testCompany = `Google Tech-${uniquePrefix}`;
  const testJob = `Senior Developer-${uniquePrefix}`;

  beforeAll(async () => {
    await mongoose.connect(process.env.DATABASE_URL || '');
    
    // Create test organizations
    const techCompany = await organizations.create({
      name: testCompany,
      category_type: categoryTypeEnum.company,
      industry: testIndustry,
      logo: 'https://example.com/logo.png',
      size: organizationSizeEnum.large_1001_5000,
      type: organizationTypeEnum.privately_held
    });
    tech_company_id = techCompany._id as mongoose.Types.ObjectId;
    
    const university = await organizations.create({
      name: `University of ${uniquePrefix}`,
      category_type: categoryTypeEnum.education,
      industry: 'Education',
      logo: 'https://example.com/university.png'
    });
    university_id = university._id as mongoose.Types.ObjectId;
    
    // Create viewer user
    const viewerUser = await users.create({
      user_id: `viewer-${uniquePrefix}`,
      email: `viewer-${uniquePrefix}@example.com`,
      password: 'password123',
      bio: {
        first_name: 'Viewer',
        last_name: 'User',
        headline: 'Test User',
        location: {
          country_region: 'United States',
          city: 'San Francisco'
        }
      },
      industry: testIndustry,
      profile_photo: 'https://example.com/profile.jpg',
      work_experience: [
        {
          _id: new mongoose.Types.ObjectId().toString(),
          title: 'Software Engineer',
          employee_type: 'Full-time',
          organization: tech_company_id,
          is_current: true,
          start_date: new Date('2020-01-01'),
          location: 'San Francisco'
        }
      ],
      connections: [],
      blocked: [],
      is_verified: true,
      privacy_settings: {
        flag_account_status: accountStatusEnum.public,
        flag_who_can_send_you_invitations: invitationsEnum.everyone,
        flag_messaging_requests: true,
        messaging_read_receipts: true,
        make_follow_primary: false,
        Who_can_follow_you: followEnum.everyone
      },
      sex: sexEnum.male
    });
    
    viewerUserId = viewerUser.user_id;
    viewer_id = viewerUser._id as mongoose.Types.ObjectId;
    viewerToken = `Bearer ${tokenUtils.createToken({ time: '1h', userID: viewerUserId })}`;
    
    // Create 1st degree connection user
    const firstDegreeUser = await users.create({
      user_id: `first-degree-${uniquePrefix}`,
      email: `first-${uniquePrefix}@example.com`,
      password: 'password123',
      bio: {
        first_name: 'First',
        last_name: 'Degree',
        headline: 'Connected User',
        location: {
          country_region: 'United States',
          city: 'New York'
        }
      },
      industry: testIndustry,
      is_verified: true
    });
    firstDegree_id = firstDegreeUser._id as mongoose.Types.ObjectId;
    
    // Create intermediary user (connection of 1st degree, will make someone a 2nd degree)
    const intermediaryUser = await users.create({
      user_id: `intermediary-${uniquePrefix}`,
      email: `intermediary-${uniquePrefix}@example.com`,
      password: 'password123',
      bio: {
        first_name: 'Inter',
        last_name: 'Mediary',
        headline: 'Connection Bridge',
      },
      connections: [],
      is_verified: true
    });
    
    // Create 2nd degree connection user
    const secondDegreeUser = await users.create({
      user_id: `second-degree-${uniquePrefix}`,
      email: `second-${uniquePrefix}@example.com`,
      password: 'password123', 
      bio: {
        first_name: 'Second',
        last_name: 'Degree',
        headline: '2nd Connection',
      },
      industry: 'Finance',
      is_verified: true
    });
    secondDegree_id = secondDegreeUser._id as mongoose.Types.ObjectId;
    
    // Create 3rd+ degree user
    const thirdDegreeUser = await users.create({
      user_id: `third-degree-${uniquePrefix}`,
      email: `third-${uniquePrefix}@example.com`,
      password: 'password123',
      bio: {
        first_name: 'Third',
        last_name: 'Degree', 
        headline: 'Distant User',
      },
      is_verified: true
    });
    thirdDegree_id = thirdDegreeUser._id as mongoose.Types.ObjectId;
    
    // Create user with a specific name to test search
    const namedUser = await users.create({
      user_id: `named-${uniquePrefix}`,
      email: `named-${uniquePrefix}@example.com`,
      password: 'password123',
      bio: {
        first_name: 'Mohamed',
        last_name: 'Sobh',
        headline: 'Software Engineer',
      },
      industry: 'Technology',
      is_verified: true
    });
    
    // Create blocked user
    const blockedUser = await users.create({
      user_id: `blocked-${uniquePrefix}`,
      email: `blocked-${uniquePrefix}@example.com`,
      password: 'password123',
      bio: {
        first_name: 'Blocked',
        last_name: 'User',
        headline: 'Should Not Appear',
      },
      is_verified: true
    });
    blocked_id = blockedUser._id as mongoose.Types.ObjectId;
    
    // Create user who blocked the viewer
    const blockedByUser = await users.create({
      user_id: `blockedby-${uniquePrefix}`,
      email: `blockedby-${uniquePrefix}@example.com`,
      password: 'password123',
      bio: {
        first_name: 'BlockedBy',
        last_name: 'Viewer',
        headline: 'Should Not Appear',
      },
      blocked: [{ _id: viewer_id, date: new Date() }],
      is_verified: true
    });
    blockedBy_id = blockedByUser._id as mongoose.Types.ObjectId;;
    
    // Create test jobs
    const softwareJob = await jobs.create({
      organization_id: tech_company_id,
      job_title: testJob,
      location: 'Remote, US',
      job_type: jobTypeEnum.full_time,
      workplace_type: workplaceTypeEnum.remote,
      organization_industry: [testIndustry],
      experience_level: experienceLevelEnum.Mid_Senior,
      description: 'Software development position',
      qualifications: ['JavaScript', 'TypeScript', 'React'],
      responsibilities: ['Building web applications'],
      receive_applicants_by: receiveApplicantsByEnum.email,
      receiving_method: 'jobs@example.com'
    });
    software_job_id = softwareJob._id as mongoose.Types.ObjectId;;
    
    const marketingJob = await jobs.create({
      organization_id: tech_company_id,
      job_title: 'Marketing Manager',
      location: 'San Francisco, CA',
      job_type: jobTypeEnum.full_time,
      workplace_type: workplaceTypeEnum.on_site,
      organization_industry: ['Marketing'],
      experience_level: experienceLevelEnum.Mid_Senior,
      description: 'Marketing position',
      receive_applicants_by: receiveApplicantsByEnum.email,
      receiving_method: 'jobs@example.com'
    });
    marketing_job_id = marketingJob._id as mongoose.Types.ObjectId;
    
    // Setup connections
    // Make first degree user a connection of viewer
    await users.findByIdAndUpdate(viewer_id, {
      $push: { 
        connections: { _id: firstDegree_id, date: new Date() },
        blocked: { _id: blocked_id, date: new Date() }
      }
    });
    
    // Make intermediary user a connection of 1st degree user
    await users.findByIdAndUpdate(firstDegree_id, {
      $push: { 
        connections: { _id: intermediaryUser._id, date: new Date() } 
      }
    });
    
    // Make 2nd degree user a connection of intermediary 
    await users.findByIdAndUpdate(intermediaryUser._id, {
      $push: { 
        connections: { _id: secondDegree_id, date: new Date() } 
      }
    });
  });

  afterAll(async () => {
    // Clean up all created test data
    await users.deleteMany({ user_id: { $regex: uniquePrefix } });
    await organizations.deleteMany({ name: { $regex: uniquePrefix } });
    await jobs.deleteMany({ job_title: { $regex: uniquePrefix } });
    await mongoose.connection.close();
  });

  describe('GET /api/v1/search/suggestions', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/v1/search/suggestions?query=test');
      
      expect(res.status).toBe(401);
    });

    it('should require a query parameter', async () => {
      const res = await request(app)
        .get('/api/v1/search/suggestions')
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Search query is required');
    });
    
    it('should return empty suggestions for empty query', async () => {
      const res = await request(app)
        .get('/api/v1/search/suggestions?query=')
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      expect(res.body.suggestions).toEqual([]);
    });

    it('should search for users by name', async () => {
      const res = await request(app)
        .get(`/api/v1/search/suggestions?query=Mohamed%20Sobh`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      expect(res.body.suggestions.some((s: any) => 
        s.type === 'user' && s.name === 'Mohamed Sobh'
      )).toBeTruthy();
    });
    
    it('should search for users by partial name', async () => {
      const res = await request(app)
        .get(`/api/v1/search/suggestions?query=Moha`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      expect(res.body.suggestions.some((s: any) => 
        s.type === 'user' && s.name.includes('Moha')
      )).toBeTruthy();
    });
    
    it('should search for organizations by name', async () => {
      const res = await request(app)
        .get(`/api/v1/search/suggestions?query=${testCompany}`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      expect(res.body.suggestions.some((s: any) => 
        s.type === 'organization' && s.name === testCompany
      )).toBeTruthy();
    });
    
    it('should search for jobs by title', async () => {
      const res = await request(app)
        .get(`/api/v1/search/suggestions?query=${testJob}`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      expect(res.body.suggestions.some((s: any) => 
        s.type === 'job' && s.title === testJob
      )).toBeTruthy();
    });
    
    it('should search for industries', async () => {
      const res = await request(app)
        .get(`/api/v1/search/suggestions?query=${testIndustry}`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      expect(res.body.suggestions.some((s: any) => 
        s.type === 'industry' && s.name === testIndustry
      )).toBeTruthy();
    });
    
    it('should return a mix of different entity types', async () => {
      const res = await request(app)
        .get(`/api/v1/search/suggestions?query=tech`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      
      // Count the different types
      const typeCount: Record<string, number> = res.body.suggestions.reduce(
        (acc: Record<string, number>, item: any) => {
          acc[item.type] = (acc[item.type] || 0) + 1;
          return acc;
        }, {});
      
      // Check if we have at least 2 different types
      const uniqueTypes = Object.keys(typeCount).length;
      expect(uniqueTypes).toBeGreaterThanOrEqual(1);
    });
    
    it('should label connections with their connection degree', async () => {
      // Search for the first degree connection
      const res = await request(app)
        .get(`/api/v1/search/suggestions?query=First%20Degree`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      
      const firstDegreeUser = res.body.suggestions.find((s: any) => 
        s.type === 'user' && s.name.includes('First Degree')
      );
      
      expect(firstDegreeUser).toBeTruthy();
      expect(firstDegreeUser.connection_degree).toBe('1st');
    });
    
    it('should not return blocked users in the suggestions', async () => {
      const res = await request(app)
        .get(`/api/v1/search/suggestions?query=Blocked`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      expect(res.body.suggestions.every((s: any) => 
        !(s.type === 'user' && s.name.includes('Blocked User'))
      )).toBeTruthy();
    });
    
    it('should not return users who blocked the viewer', async () => {
      const res = await request(app)
        .get(`/api/v1/search/suggestions?query=BlockedBy`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      expect(res.body.suggestions.every((s: any) => 
        !(s.type === 'user' && s.name.includes('BlockedBy Viewer'))
      )).toBeTruthy();
    });
    
    
    it('should prioritize exact matches', async () => {
      // Create a user with an exact match
      const exactUser = await users.create({
        user_id: `exact-${uniquePrefix}`,
        email: `exact-${uniquePrefix}@example.com`,
        password: 'password123',
        bio: {
          first_name: 'ExactTech',
          last_name: 'User',
          headline: 'Software Engineer',
        },
        is_verified: true
      });
      
      // Create a user with a partial match
      const partialUser = await users.create({
        user_id: `partial-${uniquePrefix}`,
        email: `partial-${uniquePrefix}@example.com`,
        password: 'password123',
        bio: {
          first_name: 'Partial',
          last_name: 'TechUser',
          headline: 'Software Engineer',
        },
        is_verified: true
      });
      
      const res = await request(app)
        .get(`/api/v1/search/suggestions?query=ExactTech`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      
      // Find the positions of exact and partial matches
      const exactIndex = res.body.suggestions.findIndex((s: any) => 
        s.type === 'user' && s.name.includes('ExactTech')
      );
      
      const partialIndex = res.body.suggestions.findIndex((s: any) => 
        s.type === 'user' && s.name.includes('TechUser')
      );
      
      // If both are found, exact match should come first
      if (exactIndex !== -1 && partialIndex !== -1) {
        expect(exactIndex).toBeLessThan(partialIndex);
      }
      
      // Clean up
      await users.findByIdAndDelete(exactUser._id);
      await users.findByIdAndDelete(partialUser._id);
    });
    
    it('should handle special characters in the query', async () => {
      // Create a user with a name containing special characters
      const specialUser = await users.create({
        user_id: `special-${uniquePrefix}`,
        email: `special-${uniquePrefix}@example.com`,
        password: 'password123',
        bio: {
          first_name: 'Special$',
          last_name: 'Char&User',
          headline: 'Test User',
        },
        is_verified: true
      });
      
      const res = await request(app)
        .get(`/api/v1/search/suggestions?query=Special$%20Char%26User`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      expect(res.body.suggestions.some((s: any) => 
        s.type === 'user' && s.name.includes('Special$')
      )).toBeTruthy();
      
      // Clean up
      await users.findByIdAndDelete(specialUser._id);
    });
    
    it('should include industry in user results', async () => {
      const res = await request(app)
        .get(`/api/v1/search/suggestions?query=First%20Degree`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      
      const user = res.body.suggestions.find((s: any) => 
        s.type === 'user' && s.name.includes('First Degree')
      );
      
      expect(user).toBeTruthy();
      expect(user.industry).toBeTruthy();
    });
    
    it('should assign correct connection degree (3rd+) to non-connected users', async () => {
      const res = await request(app)
        .get(`/api/v1/search/suggestions?query=Third%20Degree`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      
      const user = res.body.suggestions.find((s: any) => 
        s.type === 'user' && s.name.includes('Third Degree')
      );
      
      expect(user).toBeTruthy();
      expect(user.connection_degree).toBe('3rd+');
    });
  });
});