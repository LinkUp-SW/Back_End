import request from 'supertest';
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import privacySettingsRoutes from '../../routes/user_profile/privacy.settings.routes.ts';
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
app.use('/api/v1/user', privacySettingsRoutes);

jest.setTimeout(30000);

beforeAll(async () => {
  await mongoose.connect(process.env.DATABASE_URL || '');
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Privacy Settings Controller', () => {
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
        flag_who_can_send_you_invitations: 'Everyone',
        flag_messaging_requests: true,
        messaging_read_receipts: true,
      },
      is_verified: true,
      is_student: true,
      is_16_or_above: true,
      sex: "Male",
    });

    userId = user.user_id;
    user__id = user._id as string;
    // Generate a real JWT token
    token = `Bearer ${tokenUtils.createToken({ time: '1h', userID: userId })}`;
  });

  afterEach(async () => {
    await users.findByIdAndDelete(user__id);
    
  });

  describe('GET /api/v1/user/privacy-settings/profile-visibility/:user_id', () => {
    it('should return the profile visibility for a valid user', async () => {
      const res = await request(app)
        .get(`/api/v1/user/privacy-settings/profile-visibility/${userId}`)
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(res.body.profileVisibility).toBe(accountStatusEnum.public);
    });

    it('should return 404 if the user does not exist', async () => {
      const res = await request(app)
        .get('/api/v1/user/privacy-settings/profile-visibility/nonexistent-user-id')
        .set('Authorization', token);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });

    it('should return 401 if the token is missing', async () => {
      const res = await request(app).get(`/api/v1/user/privacy-settings/profile-visibility/${userId}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthorized');
    });
  });

  describe('PUT /api/v1/user/privacy-settings/profile-visibility/:user_id', () => {
    it('should update the profile visibility for a valid user', async () => {
      const res = await request(app)
        .put(`/api/v1/user/privacy-settings/profile-visibility/${userId}`)
        .set('Authorization', token)
        .send({ profileVisibility: accountStatusEnum.private });
  
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Profile visibility updated successfully');
      expect(res.body.profileVisibility).toBe(accountStatusEnum.private);
  
      const updatedUser = await users.findOne({ user_id: userId });
      expect(updatedUser?.privacy_settings.flag_account_status).toBe(accountStatusEnum.private);
    });
  
    it('should return 400 for an invalid profile visibility setting', async () => {
      const res = await request(app)
        .put(`/api/v1/user/privacy-settings/profile-visibility/${userId}`)
        .set('Authorization', token)
        .send({ profileVisibility: 'InvalidValue' });
  
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid profile visibility setting');
    });
  
    it('should return 404 if the user does not exist', async () => {
      const res = await request(app)
        .put('/api/v1/user/privacy-settings/profile-visibility/nonexistent-user-id')
        .set('Authorization', token)
        .send({ profileVisibility: accountStatusEnum.private });
  
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });
  
    it('should return 401 if the token is missing', async () => {
      const res = await request(app)
        .put(`/api/v1/user/privacy-settings/profile-visibility/${userId}`)
        .send({ profileVisibility: accountStatusEnum.private });
  
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthorized');
    });
  
    it('should return 403 if the user_id from the token does not match the user_id in the URL', async () => {
      // Generate a token for a different user
      const anotherToken = `Bearer ${tokenUtils.createToken({ time: '1h', userID: 'another-user-id' })}`;
  
      const res = await request(app)
        .put(`/api/v1/user/privacy-settings/profile-visibility/${userId}`)
        .set('Authorization', anotherToken)
        .send({ profileVisibility: accountStatusEnum.private });
  
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('User is not authorized to update this profile');
    });
  });
});