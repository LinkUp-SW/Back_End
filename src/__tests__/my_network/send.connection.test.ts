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

describe('Send Connection Request Controller', () => {
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
        flag_who_can_send_you_invitations: 'Everyone',
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
        flag_who_can_send_you_invitations: 'Everyone',
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

  describe('POST /api/v1/connections/send-request/:user_id', () => {
    it('should allow a user to send a connection request', async () => {
      const res = await request(app)
        .post(`/api/v1/connections/connect/${targetUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Connection request sent successfully.');

      const viewer = await users.findById(viewer__id);
      const target = await users.findById(target__id);

      expect(viewer?.sent_connections).toHaveLength(1);
      expect(target?.received_connections).toHaveLength(1);
    });

    it('should not allow a user to send a connection request to themselves', async () => {
      const res = await request(app)
        .post(`/api/v1/connections/connect/${viewerUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('You cannot send a connection request to yourself.');
    });

    it('should not allow a user to send a connection request to someone they are already connected to', async () => {
      await users.findByIdAndUpdate(viewer__id, {
        $push: { connections: { _id: target__id, date: new Date() } },
      });
      await users.findByIdAndUpdate(target__id, {
        $push: { connections: { _id: viewer__id, date: new Date() } },
      });

      const res = await request(app)
        .post(`/api/v1/connections/connect/${targetUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('You are already connected to this user.');
    });

    it('should not allow a user to send a connection request to someone who has blocked them', async () => {
      await users.findByIdAndUpdate(target__id, {
        $push: { blocked: { _id: viewer__id, date: new Date() } },
      });

      const res = await request(app)
        .post(`/api/v1/connections/connect/${targetUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('You are blocked from sending a connection request to this user.');
    });

    it('should not allow a user to send a connection request to someone within the 3-week restriction period', async () => {
      await users.findByIdAndUpdate(viewer__id, {
        $push: { withdrawn_connections: { _id: target__id, date: new Date() } },
      });

      const res = await request(app)
        .post(`/api/v1/connections/connect/${targetUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        'You cannot send another connection request to this user for 3 weeks.'
      );
    });

    it('should not allow a user to send a connection request if the target user only allows email-based invitations and the email is not provided', async () => {
      await users.findByIdAndUpdate(target__id, {
        'privacy_settings.flag_who_can_send_you_invitations': 'email',
      });

      const res = await request(app)
        .post(`/api/v1/connections/connect/${targetUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Email is required to send a connection request.');
    });

    it('should not allow a user to send a connection request if the provided email does not match the target user\'s email', async () => {
      await users.findByIdAndUpdate(target__id, {
        'privacy_settings.flag_who_can_send_you_invitations': 'email',
      });

      const res = await request(app)
        .post(`/api/v1/connections/connect/${targetUserId}`)
        .set('Authorization', viewerToken)
        .send({ email: 'wrong-email@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('The provided email does not match the user\'s email.');
    });

    it('should handle unauthorized requests', async () => {
      const res = await request(app)
        .post(`/api/v1/connections/connect/${targetUserId}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired token');
    });
  });
});