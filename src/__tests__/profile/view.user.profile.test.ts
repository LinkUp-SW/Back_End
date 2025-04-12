import request from 'supertest';
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import userProfileRoutes from '../../routes/user_profile/viewUserProfile.routes.ts';
import users, { accountStatusEnum } from '../../models/users.model.ts';
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
app.use('/api/v1/user', userProfileRoutes);

jest.setTimeout(30000);

beforeAll(async () => {
  await mongoose.connect(process.env.DATABASE_URL || '');
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('User Profile Controller', () => {
  let userId: string;
  let token: string;
  let user__id: string;

  beforeEach(async () => {
    const uniqueUserId = `test-user-id-${Date.now()}`; // Generate a unique user_id
    const uniqueEmail = `test-${Date.now()}@example.com`;
    const user = await users.create({
      user_id: uniqueUserId,
      email: uniqueEmail,
      password: 'password123',
      privacy_settings: {
        flag_account_status: accountStatusEnum.public,
      },
      is_verified: true,
      is_student: true,
      is_16_or_above: true,
      sex: "Male",
      status: "Hiring",
    });

    userId = user.user_id;
    user__id = user._id as string;
    // Generate a real JWT token
    token = `Bearer ${tokenUtils.createToken({ time: '1h', userID: userId })}`;
  });

  afterEach(async () => {
    await users.findByIdAndDelete(user__id);
  });

  describe('GET /api/v1/user/profile/:user_id', () => {
    it('should return the user profile for a valid user', async () => {
      const res = await request(app)
        .get(`/api/v1/user/profile/${userId}`)
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.is_me).toBe(true);
      expect(res.body.bio).toBeDefined();
    });

    it('should return 404 if the user does not exist', async () => {
      const res = await request(app)
        .get('/api/v1/user/profile/nonexistent-user-id')
        .set('Authorization', token);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });

    it('should return 401 if the token is missing', async () => {
      const res = await request(app).get(`/api/v1/user/profile/${userId}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthorized');
    });

    it('should return 403 if the profile is private and the viewer is not authorized', async () => {
      // Update the user's privacy settings to private
      await users.findByIdAndUpdate(user__id, {
        'privacy_settings.flag_account_status': accountStatusEnum.private,
      });

      const anotherToken = `Bearer ${tokenUtils.createToken({ time: '1h', userID: 'another-user-id' })}`;

      const res = await request(app)
        .get(`/api/v1/user/profile/${userId}`)
        .set('Authorization', anotherToken);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('This profile is private.');
    });

    it('should allow access if the viewer is the profile owner, even if the profile is private', async () => {
      // Update the user's privacy settings to private
      await users.findByIdAndUpdate(user__id, {
        'privacy_settings.flag_account_status': accountStatusEnum.private,
      });

      const res = await request(app)
        .get(`/api/v1/user/profile/${userId}`)
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.is_me).toBe(true);
      expect(res.body.bio).toBeDefined();
    });

    it('should return 403 if the viewer is blocked by the profile owner', async () => {
      // Update the user's blocked list to include the viewer
      await users.findByIdAndUpdate(user__id, {
        $push: { blocked: 'another-user-id' },
      });

      const anotherToken = `Bearer ${tokenUtils.createToken({ time: '1h', userID: 'another-user-id' })}`;

      const res = await request(app)
        .get(`/api/v1/user/profile/${userId}`)
        .set('Authorization', anotherToken);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('You are blocked from viewing this profile.');
    });


    it('should return 403 if the profile is private and the viewer is not connected', async () => {
      // Update the user's privacy settings to private
      await users.findByIdAndUpdate(user__id, {
        'privacy_settings.flag_account_status': accountStatusEnum.private,
      });

      const anotherToken = `Bearer ${tokenUtils.createToken({ time: '1h', userID: 'another-user-id' })}`;

      const res = await request(app)
        .get(`/api/v1/user/profile/${userId}`)
        .set('Authorization', anotherToken);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('This profile is private.');
    });

    it('should return the profile if the viewer is connected to the private profile', async () => {
      // Update the user's privacy settings to private and add a connection
      await users.findByIdAndUpdate(user__id, {
        'privacy_settings.flag_account_status': accountStatusEnum.private,
        $push: { connections: 'another-user-id' },
      });

      const anotherToken = `Bearer ${tokenUtils.createToken({ time: '1h', userID: 'another-user-id' })}`;

      const res = await request(app)
        .get(`/api/v1/user/profile/${userId}`)
        .set('Authorization', anotherToken);

      expect(res.status).toBe(200);
      expect(res.body.is_me).toBe(false);
      expect(res.body.bio).toBeDefined();
    });


    it('should return 500 if a database error occurs', async () => {
      jest.spyOn(users, 'findOne').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const res = await request(app)
        .get(`/api/v1/user/profile/${userId}`)
        .set('Authorization', token);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Error fetching user profile');
    });
  });
});