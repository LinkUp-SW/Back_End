import request from 'supertest';
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import userProfileRoutes from '../../routes/user_profile/privacySettings.routes.ts';
import users from '../../models/users.model.ts';
import tokenUtils from '../../utils/token.utils.ts';
import { accountStatusEnum, invitationsEnum, followEnum } from '../../models/users.model.ts';

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

describe('Privacy Settings API', () => {
  let userId: string;
  let userToken: string;
  let user_id: mongoose.Types.ObjectId;
  let otherUserToken: string;

  beforeAll(async () => {
    await mongoose.connect(process.env.DATABASE_URL || '');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Create user with all privacy settings
    const testUser = await users.create({
      user_id: `privacy-test-${Date.now()}`,
      email: `privacy-test-${Date.now()}@example.com`,
      password: 'password123',
      privacy_settings: {
        flag_account_status: accountStatusEnum.public,
        flag_who_can_send_you_invitations: invitationsEnum.everyone,
        Who_can_follow_you: followEnum.everyone,
        make_follow_primary: false,
        flag_messaging_requests: true,
        messaging_read_receipts: true
      },
      is_verified: true,
    });

    userId = testUser.user_id;
    user_id = testUser._id as mongoose.Types.ObjectId;
    userToken = `Bearer ${tokenUtils.createToken({ time: '1h', userID: userId })}`;

    // Create another user for testing unauthorized access
    const otherUser = await users.create({
      user_id: `other-user-${Date.now()}`,
      email: `other-user-${Date.now()}@example.com`,
      password: 'password123',
      is_verified: true,
    });
    
    otherUserToken = `Bearer ${tokenUtils.createToken({ time: '1h', userID: otherUser.user_id })}`;
  });

  afterEach(async () => {
    await users.findByIdAndDelete(user_id);
  });

  // 1. PROFILE VISIBILITY TESTS
  describe('Profile Visibility Settings', () => {
    it('should get profile visibility setting', async () => {
      const res = await request(app)
        .get('/api/v1/user/privacy-settings/profile-visibility')
        .set('Authorization', userToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('profileVisibility');
      expect(res.body.profileVisibility).toBe(accountStatusEnum.public);
    });

    it('should update profile visibility setting', async () => {
      const res = await request(app)
        .put('/api/v1/user/privacy-settings/profile-visibility')
        .set('Authorization', userToken)
        .send({
          profileVisibility: accountStatusEnum.private
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Profile visibility updated successfully');
      expect(res.body).toHaveProperty('profileVisibility', accountStatusEnum.private);

      // Verify it was actually updated in the database
      const updatedUser = await users.findById(user_id);
      expect(updatedUser?.privacy_settings.flag_account_status).toBe(accountStatusEnum.private);
    });

    it('should reject invalid profile visibility values', async () => {
      const res = await request(app)
        .put('/api/v1/user/privacy-settings/profile-visibility')
        .set('Authorization', userToken)
        .send({
          profileVisibility: 'InvalidValue'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid profile visibility setting');
      expect(res.body).toHaveProperty('allowedValues');
    });

    it('should require authentication for getting profile visibility', async () => {
      const res = await request(app)
        .get('/api/v1/user/privacy-settings/profile-visibility');

      expect(res.status).toBe(401);
    });

    it('should require authentication for updating profile visibility', async () => {
      const res = await request(app)
        .put('/api/v1/user/privacy-settings/profile-visibility')
        .send({
          profileVisibility: accountStatusEnum.private
        });

      expect(res.status).toBe(401);
    });
  });

  // 2. INVITATION SETTINGS TESTS
  describe('Invitation Settings', () => {
    it('should get invitation settings', async () => {
      const res = await request(app)
        .get('/api/v1/user/privacy-settings/invitations-requests')
        .set('Authorization', userToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('invitationSetting');
      expect(res.body.invitationSetting).toBe(invitationsEnum.everyone);
    });

    it('should update invitation settings', async () => {
      const res = await request(app)
        .put('/api/v1/user/privacy-settings/invitations-requests')
        .set('Authorization', userToken)
        .send({
          invitationSetting: invitationsEnum.email
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Invitation settings updated successfully');
      expect(res.body).toHaveProperty('invitationSetting', invitationsEnum.email);

      // Verify it was actually updated in the database
      const updatedUser = await users.findById(user_id);
      expect(updatedUser?.privacy_settings.flag_who_can_send_you_invitations).toBe(invitationsEnum.email);
    });

    it('should reject invalid invitation setting values', async () => {
      const res = await request(app)
        .put('/api/v1/user/privacy-settings/invitations-requests')
        .set('Authorization', userToken)
        .send({
          invitationSetting: 'InvalidValue'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid invitation setting');
      expect(res.body).toHaveProperty('allowedValues');
    });
  });

  // 3. FOLLOW SETTINGS TESTS
  describe('Who Can Follow You Settings', () => {
    it('should get follow settings', async () => {
      const res = await request(app)
        .get('/api/v1/user/privacy-settings/follow-requests')
        .set('Authorization', userToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('followSetting');
      expect(res.body.followSetting).toBe(followEnum.everyone);
    });

    it('should update follow settings', async () => {
      const res = await request(app)
        .put('/api/v1/user/privacy-settings/follow-requests')
        .set('Authorization', userToken)
        .send({
          followSetting: followEnum.connections
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Follow settings updated successfully');
      expect(res.body).toHaveProperty('followSetting', followEnum.connections);

      // Verify it was actually updated in the database
      const updatedUser = await users.findById(user_id);
      expect(updatedUser?.privacy_settings.Who_can_follow_you).toBe(followEnum.connections);
    });

    it('should reject invalid follow setting values', async () => {
      const res = await request(app)
        .put('/api/v1/user/privacy-settings/follow-requests')
        .set('Authorization', userToken)
        .send({
          followSetting: 'InvalidValue'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid follow setting');
    });
  });

  // 4. FOLLOW PRIMARY SETTINGS TESTS
  describe('Follow Primary Settings', () => {
    it('should get follow primary setting', async () => {
      const res = await request(app)
        .get('/api/v1/user/privacy-settings/follow-primary')
        .set('Authorization', userToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('isFollowPrimary');
      expect(res.body.isFollowPrimary).toBe(false);
    });

    it('should update follow primary setting', async () => {
      const res = await request(app)
        .put('/api/v1/user/privacy-settings/follow-primary')
        .set('Authorization', userToken)
        .send({
          isFollowPrimary: true
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Follow primary setting updated successfully');
      expect(res.body).toHaveProperty('isFollowPrimary', true);

      // Verify it was actually updated in the database
      const updatedUser = await users.findById(user_id);
      expect(updatedUser?.privacy_settings.make_follow_primary).toBe(true);
    });

    it('should reject non-boolean follow primary values', async () => {
      const res = await request(app)
        .put('/api/v1/user/privacy-settings/follow-primary')
        .set('Authorization', userToken)
        .send({
          isFollowPrimary: 'InvalidValue'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid follow primary setting');
    });
  });

  // 5. MESSAGING REQUESTS SETTINGS TESTS
  describe('Messaging Requests Settings', () => {
    it('should get messaging requests setting', async () => {
      const res = await request(app)
        .get('/api/v1/user/privacy-settings/messaging-requests')
        .set('Authorization', userToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('messagingRequests');
      expect(res.body.messagingRequests).toBe(true);
    });

    it('should update messaging requests setting', async () => {
      const res = await request(app)
        .put('/api/v1/user/privacy-settings/messaging-requests')
        .set('Authorization', userToken)
        .send({
          messagingRequests: false
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Messaging requests setting updated successfully');
      expect(res.body).toHaveProperty('messagingRequests', false);

      // Verify it was actually updated in the database
      const updatedUser = await users.findById(user_id);
      expect(updatedUser?.privacy_settings.flag_messaging_requests).toBe(false);
    });

    it('should reject non-boolean messaging requests values', async () => {
      const res = await request(app)
        .put('/api/v1/user/privacy-settings/messaging-requests')
        .set('Authorization', userToken)
        .send({
          messagingRequests: 'InvalidValue'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid messaging requests setting');
    });
  });

  // 6. READ RECEIPTS SETTINGS TESTS
  describe('Read Receipts Settings', () => {
    it('should get read receipts setting', async () => {
      const res = await request(app)
        .get('/api/v1/user/privacy-settings/read-receipts')
        .set('Authorization', userToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('readReceipts');
      expect(res.body.readReceipts).toBe(true);
    });

    it('should update read receipts setting', async () => {
      const res = await request(app)
        .put('/api/v1/user/privacy-settings/read-receipts')
        .set('Authorization', userToken)
        .send({
          readReceipts: false
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Read receipts setting updated successfully');
      expect(res.body).toHaveProperty('readReceipts', false);

      // Verify it was actually updated in the database
      const updatedUser = await users.findById(user_id);
      expect(updatedUser?.privacy_settings.messaging_read_receipts).toBe(false);
    });

    it('should reject non-boolean read receipts values', async () => {
      const res = await request(app)
        .put('/api/v1/user/privacy-settings/read-receipts')
        .set('Authorization', userToken)
        .send({
          readReceipts: 'true' // String instead of boolean
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid read receipts setting');
    });
  });

  // 7. EDGE CASES AND ERROR HANDLING
  describe('Edge Cases and Error Handling', () => {

    it('should handle missing request body parameters', async () => {
      const res = await request(app)
        .put('/api/v1/user/privacy-settings/profile-visibility')
        .set('Authorization', userToken)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should reject requests with malformed tokens', async () => {
      const res = await request(app)
        .get('/api/v1/user/privacy-settings/profile-visibility')
        .set('Authorization', 'Bearer malformedtoken');

      expect(res.status).toBe(401);
    });

    it('should handle all privacy settings together', async () => {
      // First update profile visibility
      await request(app)
        .put('/api/v1/user/privacy-settings/profile-visibility')
        .set('Authorization', userToken)
        .send({
          profileVisibility: accountStatusEnum.connections
        });

      // Then update invitation settings
      await request(app)
        .put('/api/v1/user/privacy-settings/invitations-requests')
        .set('Authorization', userToken)
        .send({
          invitationSetting: invitationsEnum.email
        });

      // Then update follow settings
      await request(app)
        .put('/api/v1/user/privacy-settings/follow-requests')
        .set('Authorization', userToken)
        .send({
          followSetting: followEnum.connections
        });

      // Then update follow primary
      await request(app)
        .put('/api/v1/user/privacy-settings/follow-primary')
        .set('Authorization', userToken)
        .send({
          isFollowPrimary: true
        });

      // Then update messaging requests
      await request(app)
        .put('/api/v1/user/privacy-settings/messaging-requests')
        .set('Authorization', userToken)
        .send({
          messagingRequests: false
        });

      // Then update read receipts
      await request(app)
        .put('/api/v1/user/privacy-settings/read-receipts')
        .set('Authorization', userToken)
        .send({
          readReceipts: false
        });

      // Get updated user
      const updatedUser = await users.findById(user_id);
      
      // Verify all settings were updated correctly
      expect(updatedUser?.privacy_settings.flag_account_status).toBe(accountStatusEnum.connections);
      expect(updatedUser?.privacy_settings.flag_who_can_send_you_invitations).toBe(invitationsEnum.email);
      expect(updatedUser?.privacy_settings.Who_can_follow_you).toBe(followEnum.connections);
      expect(updatedUser?.privacy_settings.make_follow_primary).toBe(true);
      expect(updatedUser?.privacy_settings.flag_messaging_requests).toBe(false);
      expect(updatedUser?.privacy_settings.messaging_read_receipts).toBe(false);
    });
  });
});