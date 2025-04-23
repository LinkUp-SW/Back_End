import request from 'supertest';
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import peopleYouMayKnowRoutes from '../../routes/my_network/peopleYouMayKnow.routes.ts';
import users from '../../models/users.model.ts';
import organizations from '../../models/organizations.model.ts';
import tokenUtils from '../../utils/token.utils.ts';

const app = express();
app.use(express.json());
app.use(
  session({
    secret: 'testsecret',
    resave: false,
    saveUninitialized: true,
  })
);
app.use('/api/v1/user', peopleYouMayKnowRoutes);

jest.setTimeout(30000);

beforeAll(async () => {
  await mongoose.connect(process.env.DATABASE_URL || '');
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('People You May Know API', () => {
  let viewerUserId: string;
  let viewerToken: string;
  let viewer__id: mongoose.Types.ObjectId;
  
  // For connections and blocked users
  let connection__id: mongoose.Types.ObjectId;
  let blocked__id: mongoose.Types.ObjectId;
  let blockedBy__id: mongoose.Types.ObjectId;
  
  // For education context
  let sameSchool__id1: mongoose.Types.ObjectId;
  let sameSchool__id2: mongoose.Types.ObjectId;
  let differentSchool__id: mongoose.Types.ObjectId;
  let school__id: mongoose.Types.ObjectId;
  let differentSchool_id2: mongoose.Types.ObjectId;
  
  // For work context
  let sameWork__id1: mongoose.Types.ObjectId;
  let sameWork__id2: mongoose.Types.ObjectId;
  let differentWork__id: mongoose.Types.ObjectId;
  let organization__id: mongoose.Types.ObjectId;
  let differentOrg__id: mongoose.Types.ObjectId;

  beforeAll(async () => {
    // Create organizations for education and work
    const school = await organizations.create({
      name: 'Test University',
      category_type: 'education'
    });
    school__id = school._id as mongoose.Types.ObjectId;

    const differentSchool = await organizations.create({
      name: 'Another University',
      category_type: 'education'
    });
    differentSchool_id2 = differentSchool._id as mongoose.Types.ObjectId;;
    
    const organization = await organizations.create({
      name: 'Test Company',
      category_type: 'company'
    });
    organization__id = organization._id as mongoose.Types.ObjectId;;
    
    const differentOrganization = await organizations.create({
      name: 'Another Company',
      category_type: 'company'
    });
    differentOrg__id = differentOrganization._id as mongoose.Types.ObjectId;;
    
    // Create viewer user with both education and work experience
    const viewerUser = await users.create({
      user_id: `viewer-${Date.now()}`,
      email: `viewer-${Date.now()}@example.com`,
      password: 'password123',
      education: [
        {
          school: school__id,
          degree: 'Bachelor',
          field_of_study: 'Computer Science',
          start_date: new Date('2020-01-01'),
          end_date: null, // Current education
        }
      ],
      work_experience: [
        {
          organization: organization__id,
          position: 'Software Engineer',
          start_date: new Date('2021-01-01'),
          is_current: true
        }
      ],
      connections: [], // Will be populated later
      blocked: [], // Will be populated later
      is_verified: true
    });
    
    viewerUserId = viewerUser.user_id;
    viewer__id = viewerUser._id as mongoose.Types.ObjectId;;
    viewerToken = `Bearer ${tokenUtils.createToken({ time: '1h', userID: viewerUserId })}`;
    
    // Create connection user
    const connectionUser = await users.create({
      user_id: `connection-${Date.now()}`,
      email: `connection-${Date.now()}@example.com`,
      password: 'password123',
      education: [
        {
          school: school__id, 
          degree: 'Bachelor',
          field_of_study: 'Computer Science',
          start_date: new Date('2020-01-01'),
          end_date: null
        }
      ],
      is_verified: true
    });
    connection__id = connectionUser._id as mongoose.Types.ObjectId;;
    
    // Create blocked user
    const blockedUser = await users.create({
      user_id: `blocked-${Date.now()}`,
      email: `blocked-${Date.now()}@example.com`,
      password: 'password123',
      education: [
        {
          school: school__id,
          degree: 'Bachelor',
          field_of_study: 'Computer Science',
          start_date: new Date('2020-01-01'),
          end_date: null
        }
      ],
      is_verified: true
    });
    blocked__id = blockedUser._id as mongoose.Types.ObjectId;;
    
    // Create user who blocked the viewer
    const blockedByUser = await users.create({
      user_id: `blockedBy-${Date.now()}`,
      email: `blockedBy-${Date.now()}@example.com`,
      password: 'password123',
      education: [
        {
          school: school__id,
          degree: 'Bachelor',
          field_of_study: 'Computer Science',
          start_date: new Date('2020-01-01'),
          end_date: null
        }
      ],
      blocked: [{ _id: viewer__id, date: new Date() }],
      is_verified: true
    });
    blockedBy__id = blockedByUser._id as mongoose.Types.ObjectId;;
    
    // Create users with same school
    const sameSchoolUser1 = await users.create({
      user_id: `sameSchool1-${Date.now()}`,
      email: `sameSchool1-${Date.now()}@example.com`,
      password: 'password123',
      education: [
        {
          school: school__id,
          degree: 'Bachelor',
          field_of_study: 'Physics',
          start_date: new Date('2020-01-01'),
          end_date: null
        }
      ],
      is_verified: true
    });
    sameSchool__id1 = sameSchoolUser1._id as mongoose.Types.ObjectId;;
    
    const sameSchoolUser2 = await users.create({
      user_id: `sameSchool2-${Date.now()}`,
      email: `sameSchool2-${Date.now()}@example.com`,
      password: 'password123',
      education: [
        {
          school: school__id,
          degree: 'Bachelor',
          field_of_study: 'Biology',
          start_date: new Date('2020-01-01'),
          end_date: null
        }
      ],
      is_verified: true
    });
    sameSchool__id2 = sameSchoolUser2._id as mongoose.Types.ObjectId;;
    
    // Create user with different school
    const differentSchoolUser = await users.create({
      user_id: `diffSchool-${Date.now()}`,
      email: `diffSchool-${Date.now()}@example.com`,
      password: 'password123',
      education: [
        {
          school: differentSchool_id2,
          degree: 'Bachelor',
          field_of_study: 'Math',
          start_date: new Date('2020-01-01'),
          end_date: null
        }
      ],
      is_verified: true
    });
    differentSchool__id = differentSchoolUser._id as mongoose.Types.ObjectId;;
    
    // Create users with same workplace
    const sameWorkUser1 = await users.create({
      user_id: `sameWork1-${Date.now()}`,
      email: `sameWork1-${Date.now()}@example.com`,
      password: 'password123',
      work_experience: [
        {
          organization: organization__id,
          position: 'Product Manager',
          start_date: new Date('2021-01-01'),
          is_current: true
        }
      ],
      is_verified: true
    });
    sameWork__id1 = sameWorkUser1._id as mongoose.Types.ObjectId;;
    
    const sameWorkUser2 = await users.create({
      user_id: `sameWork2-${Date.now()}`,
      email: `sameWork2-${Date.now()}@example.com`,
      password: 'password123',
      work_experience: [
        {
          organization: organization__id,
          position: 'UX Designer',
          start_date: new Date('2021-01-01'),
          is_current: true
        }
      ],
      is_verified: true
    });
    sameWork__id2 = sameWorkUser2._id as mongoose.Types.ObjectId;;
    
    // Create user with different workplace
    const differentWorkUser = await users.create({
      user_id: `diffWork-${Date.now()}`,
      email: `diffWork-${Date.now()}@example.com`,
      password: 'password123',
      work_experience: [
        {
          organization: differentOrg__id,
          position: 'Data Analyst',
          start_date: new Date('2021-01-01'),
          is_current: true
        }
      ],
      is_verified: true
    });
    differentWork__id = differentWorkUser._id as mongoose.Types.ObjectId;;
    
    // Update viewer's connections and blocked lists
    await users.findByIdAndUpdate(viewer__id, {
      $push: { 
        connections: { _id: connection__id, date: new Date() },
        blocked: { _id: blocked__id, date: new Date() }
      }
    });
  });

  afterAll(async () => {
    // Clean up all created users
    await users.findByIdAndDelete(viewer__id);
    await users.findByIdAndDelete(connection__id);
    await users.findByIdAndDelete(blocked__id);
    await users.findByIdAndDelete(blockedBy__id);
    await users.findByIdAndDelete(sameSchool__id1);
    await users.findByIdAndDelete(sameSchool__id2);
    await users.findByIdAndDelete(differentSchool__id);
    await users.findByIdAndDelete(sameWork__id1);
    await users.findByIdAndDelete(sameWork__id2);
    await users.findByIdAndDelete(differentWork__id);
    
    // Clean up organizations
    await organizations.findByIdAndDelete(school__id);
    await organizations.findByIdAndDelete(differentSchool_id2);
    await organizations.findByIdAndDelete(organization__id);
    await organizations.findByIdAndDelete(differentOrg__id);
  });

  describe('GET /api/v1/user/people-you-may-know', () => {
    it('should return people from the same school in education context', async () => {
      const res = await request(app)
        .get('/api/v1/user/people-you-may-know?context=education')
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.people.length).toBeGreaterThan(0);
      expect(res.body.institutionName).toBe('Test University');
      
      // Should contain users from the same school
      const userIds = res.body.people.map((person: any) => person.user_id);
      expect(userIds).toContainEqual(expect.stringMatching(/sameSchool1/));
      expect(userIds).toContainEqual(expect.stringMatching(/sameSchool2/));
      
      // Should not contain users with different schools
      expect(userIds).not.toContain(expect.stringMatching(/diffSchool/));
    });

    it('should return people from the same workplace in work_experience context', async () => {
      const res = await request(app)
        .get('/api/v1/user/people-you-may-know?context=work_experience')
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.people.length).toBeGreaterThan(0);
      expect(res.body.institutionName).toBe('Test Company');
      
      // Should contain users from the same workplace
      const userIds = res.body.people.map((person: any) => person.user_id);
      expect(userIds).toContainEqual(expect.stringMatching(/sameWork1/));
      expect(userIds).toContainEqual(expect.stringMatching(/sameWork2/));
      
      // Should not contain users with different workplaces
      expect(userIds).not.toContain(expect.stringMatching(/diffWork/));
    });

    it('should not include the viewer in the results', async () => {
      const res = await request(app)
        .get('/api/v1/user/people-you-may-know?context=education')
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      
      // Should not contain the viewer
      const userIds = res.body.people.map((person: any) => person.user_id);
      expect(userIds).not.toContain(viewerUserId);
    });

    it('should not include connections in the results', async () => {
      const res = await request(app)
        .get('/api/v1/user/people-you-may-know?context=education')
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      
      // Should not contain connections
      const ids = res.body.people.map((person: any) => person._id);
      expect(ids).not.toContain(connection__id.toString());
    });

    it('should not include blocked users in the results', async () => {
      const res = await request(app)
        .get('/api/v1/user/people-you-may-know?context=education')
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      
      // Should not contain blocked users
      const ids = res.body.people.map((person: any) => person._id);
      expect(ids).not.toContain(blocked__id.toString());
    });

    it('should not include users who blocked the viewer in the results', async () => {
      const res = await request(app)
        .get('/api/v1/user/people-you-may-know?context=education')
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      
      // Should not contain users who blocked the viewer
      const ids = res.body.people.map((person: any) => person._id);
      expect(ids).not.toContain(blockedBy__id.toString());
    });

    it('should handle pagination correctly', async () => {
      // First request with limit=1
      const res1 = await request(app)
        .get('/api/v1/user/people-you-may-know?context=education&limit=1')
        .set('Authorization', viewerToken);

      expect(res1.status).toBe(200);
      expect(res1.body.people.length).toBe(1); // Should respect the limit
      expect(res1.body.nextCursor).toBeTruthy(); // Should have a next cursor

      // Second request with the cursor from first request
      const res2 = await request(app)
        .get(`/api/v1/user/people-you-may-know?context=education&limit=1&cursor=${res1.body.nextCursor}`)
        .set('Authorization', viewerToken);

      expect(res2.status).toBe(200);
      expect(res2.body.people.length).toBe(1);
      
      // Should return different users in each page
      expect(res1.body.people[0]._id).not.toEqual(res2.body.people[0]._id);
    });

    it('should return an empty list if the user has no education data', async () => {
      // Create a user with no education data
      const noEducationUser = await users.create({
        user_id: `noEdu-${Date.now()}`,
        email: `noEdu-${Date.now()}@example.com`,
        password: 'password123',
        is_verified: true
      });
      
      const noEduToken = `Bearer ${tokenUtils.createToken({ time: '1h', userID: noEducationUser.user_id })}`;
      
      const res = await request(app)
        .get('/api/v1/user/people-you-may-know?context=education')
        .set('Authorization', noEduToken);

      expect(res.status).toBe(200);
      expect(res.body.people).toHaveLength(0);
      expect(res.body.institutionName).toBeNull();
      
      // Clean up
      await users.findByIdAndDelete(noEducationUser._id);
    });

    it('should return an empty list if the user has no work experience data', async () => {
      // Create a user with no work experience data
      const noWorkUser = await users.create({
        user_id: `noWork-${Date.now()}`,
        email: `noWork-${Date.now()}@example.com`,
        password: 'password123',
        is_verified: true
      });
      
      const noWorkToken = `Bearer ${tokenUtils.createToken({ time: '1h', userID: noWorkUser.user_id })}`;
      
      const res = await request(app)
        .get('/api/v1/user/people-you-may-know?context=work_experience')
        .set('Authorization', noWorkToken);

      expect(res.status).toBe(200);
      expect(res.body.people).toHaveLength(0);
      expect(res.body.institutionName).toBeNull();
      
      // Clean up
      await users.findByIdAndDelete(noWorkUser._id);
    });


    it('should validate the context parameter', async () => {
      const res = await request(app)
        .get('/api/v1/user/people-you-may-know?context=invalid_context')
        .set('Authorization', viewerToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid context. Use 'education' or 'work_experience'.");
    });

    it('should handle missing context parameter', async () => {
      const res = await request(app)
        .get('/api/v1/user/people-you-may-know')
        .set('Authorization', viewerToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid context. Use 'education' or 'work_experience'.");
    });
  });
});