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

describe('Block, Unblock, and Get Blocked List', () => {
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

  describe('POST /api/v1/connections/block/:user_id', () => {
    it('should allow a user to block another user', async () => {
      const res = await request(app)
        .post(`/api/v1/connections/block/${targetUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('User blocked successfully.');

      const viewer = await users.findById(viewer__id);
      expect(viewer?.blocked).toHaveLength(1);
      expect(viewer?.blocked[0]._id.toString()).toBe(target__id.toString());
    });

    it('should not allow a user to block themselves', async () => {
      const res = await request(app)
        .post(`/api/v1/connections/block/${viewerUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('You cannot block yourself.');
    });

    it('should not allow a user to block someone they already blocked', async () => {
      await users.findByIdAndUpdate(viewer__id, {
        $push: { blocked: { _id: target__id, date: new Date() } },
      });

      const res = await request(app)
        .post(`/api/v1/connections/block/${targetUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('This user is already blocked.');
    });

    it('should handle unauthorized requests', async () => {
      const res = await request(app)
        .post(`/api/v1/connections/block/${targetUserId}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired token');
    });
  });

  describe('DELETE /api/v1/connections/manage-by-blocked-list/unblock/:user_id', () => {
    it('should allow a user to unblock another user', async () => {
      // Set up blocked user
      await users.findByIdAndUpdate(viewer__id, {
        $push: { blocked: { _id: target__id, date: new Date() } },
      });

      const res = await request(app)
        .delete(`/api/v1/connections/manage-by-blocked-list/unblock/${targetUserId}`)
        .set('Authorization', viewerToken)
        .send({ password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('User unblocked successfully.');

      const viewer = await users.findById(viewer__id);
      expect(viewer?.blocked).toHaveLength(0);
    });

    it('should not allow a user to unblock someone who is not blocked', async () => {
      const res = await request(app)
        .delete(`/api/v1/connections/manage-by-blocked-list/unblock/${targetUserId}`)
        .set('Authorization', viewerToken)
        .send({ password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('This user is not in your blocked list.');
    });

    it('should not allow a user to unblock without providing a password', async () => {
      // Set up blocked user
      await users.findByIdAndUpdate(viewer__id, {
        $push: { blocked: { _id: target__id, date: new Date() } },
      });

      const res = await request(app)
        .delete(`/api/v1/connections/manage-by-blocked-list/unblock/${targetUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Password is required to unblock a user.');
    });

    it('should not allow a user to unblock with an invalid password', async () => {
      // Set up blocked user
      await users.findByIdAndUpdate(viewer__id, {
        $push: { blocked: { _id: target__id, date: new Date() } },
      });

      const res = await request(app)
        .delete(`/api/v1/connections/manage-by-blocked-list/unblock/${targetUserId}`)
        .set('Authorization', viewerToken)
        .send({ password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid password.');
    });

    it('should handle unauthorized requests', async () => {
      const res = await request(app)
        .delete(`/api/v1/connections/manage-by-blocked-list/unblock/${targetUserId}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired token');
    });
  });

  describe('GET /api/v1/connections/manage-by-blocked-list/blocked', () => {
    it('should return the list of blocked users', async () => {
      // Set up blocked user
      await users.findByIdAndUpdate(viewer__id, {
        $push: { blocked: { _id: target__id, date: new Date() } },
      });

      const res = await request(app)
        .get('/api/v1/connections/manage-by-blocked-list/blocked')
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.blocked_list).toHaveLength(1);
      expect(res.body.blocked_list[0].user_id).toBe(targetUserId);
    });

    it('should return an empty list if no users are blocked', async () => {
      const res = await request(app)
        .get('/api/v1/connections/manage-by-blocked-list/blocked')
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.blocked_list).toHaveLength(0);
    });

    it('should handle unauthorized requests', async () => {
      const res = await request(app)
        .get('/api/v1/connections/manage-by-blocked-list/blocked');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired token');
    });
  });
});