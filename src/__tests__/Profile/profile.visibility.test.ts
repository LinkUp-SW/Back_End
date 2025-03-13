import request from 'supertest';
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import privacySettingsRoutes from '../../routes/privacy.settings.routes.ts';
import users, { usersInterface } from '../../models/users.model.ts';
import privacy_settings, { privacySettingsInterface, accountStatusEnum } from '../../models/privacy_settings.model.ts';

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
  let privacySettingsId: string;

  beforeEach(async () => {
    userId = '67d36552f474a65024437d52';

    const user: usersInterface | null = await users.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const privacySettingsDoc: privacySettingsInterface = await privacy_settings.create({
      flag_account_status: accountStatusEnum.public,
      flag_who_can_send_you_invitations: 'Everyone',
      flag_messaging_requests: false,
      messaging_read_receipts: true,
    });

    user.privacy_settings = privacySettingsDoc._id as unknown as privacySettingsInterface;
    await user.save();

    privacySettingsId = (privacySettingsDoc._id as mongoose.Types.ObjectId).toString();
  });

  describe('GET /api/v1/user/privacy-settings/profile-visibility/:user_id', () => {
    it('should return the privacy settings for a valid user', async () => {
      const res = await request(app).get(`/api/v1/user/privacy-settings/profile-visibility/${userId}`);
      expect(res.status).toBe(200);
      expect(res.body.profileVisibility).toBe(accountStatusEnum.public); // Updated to match the controller's response
    });

    it('should return 404 if the user does not have privacy settings', async () => {
      await users.findByIdAndUpdate(userId, { privacy_settings: null });
      const res = await request(app).get(`/api/v1/user/privacy-settings/profile-visibility/${userId}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User does not have privacy settings');
    });

    it('should return 404 if the privacy settings are not found', async () => {
      await privacy_settings.findByIdAndDelete(privacySettingsId);
      const res = await request(app).get(`/api/v1/user/privacy-settings/profile-visibility/${userId}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Privacy settings not found');
    });

    it('should return 400 for an invalid user ID', async () => {
      const res = await request(app).get('/api/v1/user/privacy-settings/profile-visibility/invalidUserId');
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid user ID format');
    });
  });

  describe('PUT /api/v1/user/privacy-settings/profile-visibility/:user_id', () => {
    it('should update the privacy settings for a valid user', async () => {
      const res = await request(app)
        .put(`/api/v1/user/privacy-settings/profile-visibility/${userId}`)
        .send({ profileVisibility: accountStatusEnum.private });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Profile visibility updated successfully'); // Updated to match the controller's response
      expect(res.body.profileVisibility).toBe(accountStatusEnum.private);
    });

    it('should return 400 for an invalid profile visibility setting', async () => {
      const res = await request(app)
        .put(`/api/v1/user/privacy-settings/profile-visibility/${userId}`)
        .send({ profileVisibility: 'InvalidValue' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid profile visibility setting');
    });

    it('should return 404 if the user does not have privacy settings', async () => {
      await users.findByIdAndUpdate(userId, { privacy_settings: null });
      const res = await request(app)
        .put(`/api/v1/user/privacy-settings/profile-visibility/${userId}`)
        .send({ profileVisibility: accountStatusEnum.private });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User does not have privacy settings');
    });

    it('should return 404 if the privacy settings are not found', async () => {
      await privacy_settings.findByIdAndDelete(privacySettingsId);
      const res = await request(app)
        .put(`/api/v1/user/privacy-settings/profile-visibility/${userId}`)
        .send({ profileVisibility: accountStatusEnum.private });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Privacy settings not found');
    });

    it('should return 400 for an invalid user ID', async () => {
      const res = await request(app)
        .put('/api/v1/user/privacy-settings/profile-visibility/invalidUserId')
        .send({ profileVisibility: accountStatusEnum.private });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid user ID format');
    });
  });
});