import request from 'supertest';
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import connectionsRoutes from '../../routes/my_network/myNetwork.routes.ts';
import users from '../../models/users.model.ts';
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
app.use('/api/v1/connections', connectionsRoutes);

jest.setTimeout(30000);

beforeAll(async () => {
  await mongoose.connect(process.env.DATABASE_URL || '');
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Unfollow User Controller', () => {
  let viewerUserId: string;
  let targetUserId: string;
  let viewerToken: string;
  let targetToken: string;
  let viewer__id: string;
  let target__id: string;

  beforeEach(async () => {
    // Create viewer user
    const viewerUser = await users.create({
      user_id: `viewer-${Date.now()}`,
      email: `viewer-${Date.now()}@example.com`,
      password: 'password123',
      privacy_settings: {
        Who_can_follow_you: 'Everyone',
      },
      is_verified: true,
    });

    viewerUserId = viewerUser.user_id;
    viewer__id = viewerUser._id as string;
    viewerToken = `Bearer ${tokenUtils.createToken({ time: '1h', userID: viewerUserId })}`;

    // Create target user
    const targetUser = await users.create({
      user_id: `target-${Date.now()}`,
      email: `target-${Date.now()}@example.com`,
      password: 'password123',
      privacy_settings: {
        Who_can_follow_you: 'Everyone',
      },
      is_verified: true,
    });

    targetUserId = targetUser.user_id;
    target__id = targetUser._id as string;
    targetToken = `Bearer ${tokenUtils.createToken({ time: '1h', userID: targetUserId })}`;
  });

  afterEach(async () => {
    await users.findByIdAndDelete(viewer__id);
    await users.findByIdAndDelete(target__id);
  });

  describe('DELETE /api/v1/connections/unfollow/:user_id', () => {
    it('should allow a user to unfollow another user', async () => {
      // Set up following relationship
      await users.findByIdAndUpdate(target__id, {
        $push: { followers: viewer__id },
      });
      await users.findByIdAndUpdate(viewer__id, {
        $push: { following: target__id },
      });

      const res = await request(app)
        .delete(`/api/v1/connections/unfollow/${targetUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('You have unfollowed this user.');

      const viewer = await users.findById(viewer__id);
      const target = await users.findById(target__id);

      expect(viewer?.following).not.toContainEqual(target__id);
      expect(target?.followers).not.toContainEqual(viewer__id);
    });

    it('should not allow a user to unfollow themselves', async () => {
      const res = await request(app)
        .delete(`/api/v1/connections/unfollow/${viewerUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('You cannot unfollow yourself.');
    });

    it('should not allow a user to unfollow someone they are not following', async () => {
      const res = await request(app)
        .delete(`/api/v1/connections/unfollow/${targetUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('You are not following this user.');
    });

    it('should handle invalid user_id gracefully', async () => {
      const invalidUserId = 'invalid-user-id';

      const res = await request(app)
        .delete(`/api/v1/connections/unfollow/${invalidUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });

    it('should handle unauthorized requests', async () => {
      const res = await request(app)
        .delete(`/api/v1/connections/unfollow/${targetUserId}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthorized');
    });
  });
});