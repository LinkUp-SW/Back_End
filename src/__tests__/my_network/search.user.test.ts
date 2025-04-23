import request from 'supertest';
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import userSearchRoutes from '../../routes/my_network/userSearch.routes.ts';
import users from '../../models/users.model.ts';
import organizations from '../../models/organizations.model.ts';
import tokenUtils from '../../utils/token.utils.ts';
import { sexEnum, statusEnum, accountStatusEnum, invitationsEnum, followEnum } from '../../models/users.model.ts';
import { organizationSizeEnum, organizationTypeEnum, categoryTypeEnum } from '../../models/organizations.model.ts';

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

describe('User Search API', () => {
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
  let finance_company_id: mongoose.Types.ObjectId;
  
  // Create multiple users for pagination testing
  const paginationUsers: mongoose.Types.ObjectId[] = [];

  // Common names to search for
  const uniquePrefix = `test-search-${Date.now()}`;
  const testIndustry = `Tech Industry-${uniquePrefix}`;
  const testCompany = `TechCorp-${uniquePrefix}`;
  const testName = `John Doe-${uniquePrefix}`;

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
    
    const financeCompany = await organizations.create({
      name: `Finance Corp-${uniquePrefix}`,
      category_type: categoryTypeEnum.company,
      industry: 'Finance',
      logo: 'https://example.com/finance.png',
      size: organizationSizeEnum.medium_51_200,
      type: organizationTypeEnum.privately_held
    });
    finance_company_id = financeCompany._id as mongoose.Types.ObjectId;
    
    // Create viewer user
    const viewerUser = await users.create({
      user_id: `viewer-${uniquePrefix}`,
      email: `viewer-${uniquePrefix}@example.com`,
      password: 'password123',
      bio: {
        first_name: 'Viewer',
        last_name: 'User',
        headline: 'Test Viewer',
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
      work_experience: [
        {
          _id: new mongoose.Types.ObjectId().toString(),
          title: 'Product Manager',
          employee_type: 'Full-time',
          organization: tech_company_id,
          is_current: true,
          start_date: new Date('2019-01-01'),
          location: 'New York'
        }
      ],
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
      work_experience: [
        {
          _id: new mongoose.Types.ObjectId().toString(),
          title: 'Financial Analyst',
          employee_type: 'Full-time',
          organization: finance_company_id,
          is_current: true,
          start_date: new Date('2021-01-01'),
          location: 'Chicago'
        }
      ],
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
        first_name: 'John',
        last_name: 'Doe',
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
    blockedBy_id = blockedByUser._id as mongoose.Types.ObjectId;
    
    // Create multiple users for pagination testing (all with searchable name)
    for (let i = 0; i < 15; i++) {
      const paginationUser = await users.create({
        user_id: `pagination-${i}-${uniquePrefix}`,
        email: `pagination-${i}-${uniquePrefix}@example.com`,
        password: 'password123',
        bio: {
          first_name: 'Paginate',
          last_name: `User-${i}`,
          headline: 'Pagination Test User',
        },
        is_verified: true
      });
      paginationUsers.push(paginationUser._id as mongoose.Types.ObjectId);
    }
    
    // Setup connections
    // Make first degree user a connection of viewer
    await users.findByIdAndUpdate(viewer_id, {
        $push: { 
          connections: { _id: firstDegree_id, date: new Date() },
          blocked: { _id: blocked_id, date: new Date() }
        }
      });
    

    
    // Connect first degree user directly to second degree user
await users.findByIdAndUpdate(firstDegree_id, {
    $push: { 
      connections: { _id: secondDegree_id, date: new Date() } 
    }
  });
  });

  afterAll(async () => {
    // Clean up all created test data
    await users.deleteMany({ user_id: { $regex: uniquePrefix } });
    await organizations.deleteMany({ name: { $regex: uniquePrefix } });
    await mongoose.connection.close();
  });

  describe('GET /api/v1/search/users', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/v1/search/users?query=test');
      
      expect(res.status).toBe(401);
    });

    it('should search for users by name', async () => {
      const res = await request(app)
        .get(`/api/v1/search/users?query=John%20Doe&filter=name`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      expect(res.body.people.some((p: any) => p.name.includes('John Doe'))).toBeTruthy();
    });
    
    it('should search for users by company', async () => {
      const res = await request(app)
        .get(`/api/v1/search/users?query=${testCompany}&filter=company`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      expect(res.body.people.length).toBeGreaterThanOrEqual(1);
    });
    
    it('should search for users by industry', async () => {
      const res = await request(app)
        .get(`/api/v1/search/users?query=${testIndustry}&filter=industry`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      expect(res.body.people.length).toBeGreaterThanOrEqual(1);
    });

    it('should include connection degree in search results', async () => {
      const res = await request(app)
        .get(`/api/v1/search/users?query=Degree`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      
      const firstDegreeUser = res.body.people.find((p: any) => p.name.includes('First Degree'));
      const secondDegreeUser = res.body.people.find((p: any) => p.name.includes('Second Degree'));
      const thirdDegreeUser = res.body.people.find((p: any) => p.name.includes('Third Degree'));
      
      if (firstDegreeUser) {
        expect(firstDegreeUser.connection_degree).toBe('1st');
      }
      
      if (secondDegreeUser) {
        expect(secondDegreeUser.connection_degree).toBe('2nd');
      }
      
      if (thirdDegreeUser) {
        expect(thirdDegreeUser.connection_degree).toBe('3rd+');
      }
    });
    
    it('should filter results by 1st degree connections', async () => {
      const res = await request(app)
        .get(`/api/v1/search/users?connectionDegree=1st`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      
      // All results should be 1st connections
      expect(res.body.people.every((p: any) => p.connection_degree === '1st')).toBeTruthy();
      
      // Should include our test 1st degree connection
      expect(res.body.people.some((p: any) => p.name.includes('First Degree'))).toBeTruthy();
    });
    
    it('should filter results by 2nd degree connections', async () => {
      const res = await request(app)
        .get(`/api/v1/search/users?connectionDegree=2nd`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      
      // All results should be 2nd connections
      expect(res.body.people.every((p: any) => p.connection_degree === '2nd')).toBeTruthy();
      
      // Should include our test 2nd degree connection
      expect(res.body.people.some((p: any) => p.name.includes('Second Degree'))).toBeTruthy();
    });
    
    // In your test file
it('should filter results by 3rd+ degree connections', async () => {
    const res = await request(app)
      .get(`/api/v1/search/users?connectionDegree=3rd%2B&query=Third`)
      .set('Authorization', viewerToken);
    
    expect(res.status).toBe(200);
    
    // All results should be 3rd+ connections
    expect(res.body.people.every((p: any) => p.connection_degree === '3rd+')).toBeTruthy();
    
    // Should include our test 3rd degree connection
    expect(res.body.people.some((p: any) => p.name.includes('Third Degree'))).toBeTruthy();
  });
    
    it('should not return blocked users in search results', async () => {
      const res = await request(app)
        .get(`/api/v1/search/users?query=Blocked`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      
      // No results should contain "Blocked User"
      expect(res.body.people.every((p: any) => !p.name.includes('Blocked User'))).toBeTruthy();
    });
    
    it('should not return users who blocked the viewer', async () => {
      const res = await request(app)
        .get(`/api/v1/search/users?query=BlockedBy`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      
      // No results should contain "BlockedBy Viewer"
      expect(res.body.people.every((p: any) => !p.name.includes('BlockedBy Viewer'))).toBeTruthy();
    });

    it('should handle pagination properly', async () => {
      // First page
      const res1 = await request(app)
        .get(`/api/v1/search/users?query=Paginate&page=1&limit=5`)
        .set('Authorization', viewerToken);
      
      expect(res1.status).toBe(200);
      expect(res1.body.people.length).toBeLessThanOrEqual(5);
      expect(res1.body.pagination.page).toBe(1);
      expect(res1.body.pagination.limit).toBe(5);
      expect(res1.body.pagination.total).toBeGreaterThanOrEqual(10);
      
      // Second page
      const res2 = await request(app)
        .get(`/api/v1/search/users?query=Paginate&page=2&limit=5`)
        .set('Authorization', viewerToken);
      
      expect(res2.status).toBe(200);
      expect(res2.body.people.length).toBeLessThanOrEqual(5);
      expect(res2.body.pagination.page).toBe(2);
      
      // Users on first page should be different from users on second page
      const firstPageIds = res1.body.people.map((p: any) => p.user_id);
      const secondPageIds = res2.body.people.map((p: any) => p.user_id);
      
      // No user should appear on both pages
      const intersection = firstPageIds.filter((id: string) => secondPageIds.includes(id));
      expect(intersection.length).toBe(0);
    });

    it('should not have blocked users in any pagination page', async () => {
      // Create a special blocked user for this test
      const specialBlockedUser = await users.create({
        user_id: `special-blocked-${uniquePrefix}`,
        email: `special-blocked-${uniquePrefix}@example.com`,
        password: 'password123',
        bio: {
          first_name: 'Paginate',
          last_name: 'Blocked',
          headline: 'Should Not Appear',
        },
        is_verified: true
      });
      
      // Block this user
      await users.findByIdAndUpdate(viewer_id, {
        $push: { 
          blocked: { _id: specialBlockedUser._id, date: new Date() }
        }
      });
      
      // Request multiple pages to verify blocked user doesn't appear in any
      const pages = 3;
      const limit = 5;
      
      for (let page = 1; page <= pages; page++) {
        const res = await request(app)
          .get(`/api/v1/search/users?query=Paginate&page=${page}&limit=${limit}`)
          .set('Authorization', viewerToken);
        
        expect(res.status).toBe(200);
        
        // Verify the blocked user is not in this page
        expect(res.body.people.every((p: any) => !p.name.includes('Paginate Blocked'))).toBeTruthy();
      }
      
      // Clean up
      await users.findByIdAndDelete(specialBlockedUser._id);
    });

    it('should return empty results for nonexistent query', async () => {
      const res = await request(app)
        .get(`/api/v1/search/users?query=ThisQueryShouldNotMatchAnything${Date.now()}`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      expect(res.body.people.length).toBe(0);
      expect(res.body.pagination.total).toBe(0);
    });

    it('should handle special characters in search query', async () => {
      // Create a user with special characters in name
      const specialCharUser = await users.create({
        user_id: `special-char-${uniquePrefix}`,
        email: `special-char-${uniquePrefix}@example.com`,
        password: 'password123',
        bio: {
          first_name: 'Special&',
          last_name: 'Char%User',
          headline: 'Test User',
        },
        is_verified: true
      });
      
      const res = await request(app)
        .get(`/api/v1/search/users?query=Special%26%20Char%25User`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      expect(res.body.people.some((p: any) => p.name.includes('Special&'))).toBeTruthy();
      
      // Clean up
      await users.findByIdAndDelete(specialCharUser._id);
    });

    it('should include mutual connections information', async () => {
      // Create users for testing mutual connections
      const mutualConnectionUser = await users.create({
        user_id: `mutual-connection-${uniquePrefix}`,
        email: `mutual-${uniquePrefix}@example.com`,
        password: 'password123',
        bio: {
          first_name: 'Mutual',
          last_name: 'Connection',
          headline: 'Shared Connection',
        },
        is_verified: true
      });
      
      const targetUser = await users.create({
        user_id: `target-user-${uniquePrefix}`,
        email: `target-${uniquePrefix}@example.com`,
        password: 'password123',
        bio: {
          first_name: 'Target',
          last_name: 'WithMutual',
          headline: 'Has Mutual Connection',
        },
        is_verified: true
      });
      
      // Add mutual connection user as connection to both viewer and target
      await users.findByIdAndUpdate(viewer_id, {
        $push: { 
          connections: { _id: mutualConnectionUser._id, date: new Date() }
        }
      });
      
      await users.findByIdAndUpdate(targetUser._id, {
        $push: { 
          connections: { _id: mutualConnectionUser._id, date: new Date() }
        }
      });
      
      const res = await request(app)
        .get(`/api/v1/search/users?query=Target%20WithMutual`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      
      const targetUserResult = res.body.people.find((p: any) => p.name.includes('Target WithMutual'));
      expect(targetUserResult).toBeTruthy();
      expect(targetUserResult.mutual_connections).toBeTruthy();
      expect(targetUserResult.mutual_connections.count).toBeGreaterThanOrEqual(1);
      expect(targetUserResult.mutual_connections.suggested_name).toBeTruthy();
      
      // Clean up
      await users.findByIdAndDelete(mutualConnectionUser._id);
      await users.findByIdAndDelete(targetUser._id);
    });

    it('should handle invalid page number gracefully', async () => {
      const res = await request(app)
        .get(`/api/v1/search/users?query=Paginate&page=-1&limit=5`)
        .set('Authorization', viewerToken);
      
      // Should default to page 1
      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
    });

    it('should handle large page number beyond results gracefully', async () => {
      const res = await request(app)
        .get(`/api/v1/search/users?query=Paginate&page=999&limit=5`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      expect(res.body.people.length).toBe(0);
    });

    it('should handle invalid limit gracefully', async () => {
      const res = await request(app)
        .get(`/api/v1/search/users?query=Paginate&page=1&limit=-5`)
        .set('Authorization', viewerToken);
      
      // Should use default limit
      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBeGreaterThan(0);
    });

    it('should cap results at a reasonable maximum even with large limit value', async () => {
      const res = await request(app)
        .get(`/api/v1/search/users?query=Paginate&page=1&limit=1000`)
        .set('Authorization', viewerToken);
      
      expect(res.status).toBe(200);
      // Assuming service has a reasonable cap
      expect(res.body.people.length).toBeLessThanOrEqual(100);
    });
  });
});