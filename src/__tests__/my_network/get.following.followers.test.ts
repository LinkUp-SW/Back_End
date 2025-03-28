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

describe('Get Following and Followers List', () => {
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

  describe('GET /api/v1/connections/my-network/network-manager/following', () => {
    it('should return the list of users the viewer is following', async () => {
      // Set up following relationship
      await users.findByIdAndUpdate(viewer__id, {
        $push: { following: target__id },
      });
      await users.findByIdAndUpdate(target__id, {
        $push: { followers: viewer__id },
      });

      const res = await request(app)
        .get('/api/v1/connections/my-network/network-manager/following')
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.following).toHaveLength(1);
      expect(res.body.following[0].user_id).toBe(targetUserId);
    });

    it('should return an empty list if the viewer is not following anyone', async () => {
      const res = await request(app)
        .get('/api/v1/connections/my-network/network-manager/following')
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.following).toHaveLength(0);
    });

    it('should handle unauthorized requests', async () => {
      const res = await request(app)
        .get('/api/v1/connections/my-network/network-manager/following');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthorized');
    });
  });

  describe('GET /api/v1/connections/my-network/network-manager/followers', () => {
    it('should return the list of users following the viewer', async () => {
      // Set up followers relationship
      await users.findByIdAndUpdate(viewer__id, {
        $push: { followers: target__id },
      });
      await users.findByIdAndUpdate(target__id, {
        $push: { following: viewer__id },
      });

      const res = await request(app)
        .get('/api/v1/connections/my-network/network-manager/followers')
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.followers).toHaveLength(1);
      expect(res.body.followers[0].user_id).toBe(targetUserId);
      expect(res.body.followers[0].following).toBe(false); // Viewer is not following back
    });

    it('should include the `following` attribute for each follower', async () => {
      // Set up mutual following relationship
      await users.findByIdAndUpdate(viewer__id, {
        $push: { followers: target__id, following: target__id },
      });
      await users.findByIdAndUpdate(target__id, {
        $push: { followers: viewer__id, following: viewer__id },
      });

      const res = await request(app)
        .get('/api/v1/connections/my-network/network-manager/followers')
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.followers).toHaveLength(1);
      expect(res.body.followers[0].user_id).toBe(targetUserId);
      expect(res.body.followers[0].following).toBe(true); // Viewer is following back
    });

    it('should return an empty list if the viewer has no followers', async () => {
      const res = await request(app)
        .get('/api/v1/connections/my-network/network-manager/followers')
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.followers).toHaveLength(0);
    });

    it('should handle unauthorized requests', async () => {
      const res = await request(app)
        .get('/api/v1/connections/my-network/network-manager/followers');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthorized');
    });
  });
});