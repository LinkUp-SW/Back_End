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

describe('Manage Connections', () => {
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

  describe('POST /api/v1/connections/accept/:user_id', () => {
    it('should allow a user to accept a connection request', async () => {
      // Set up received connection request
      await users.findByIdAndUpdate(viewer__id, {
        $push: { received_connections: { _id: target__id, date: new Date() } },
      });
      await users.findByIdAndUpdate(target__id, {
        $push: { sent_connections: { _id: viewer__id, date: new Date() } },
      });

      const res = await request(app)
        .post(`/api/v1/connections/accept/${targetUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Connection request accepted successfully.');

      const viewer = await users.findById(viewer__id);
      const target = await users.findById(target__id);

      expect(viewer?.connections).toHaveLength(1);
      expect(target?.connections).toHaveLength(1);
    });

    it('should not allow a user to accept a non-existent connection request', async () => {
      const res = await request(app)
        .post(`/api/v1/connections/accept/${targetUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('No pending connection request from this user.');
    });

    it('should handle unauthorized requests', async () => {
      const res = await request(app)
        .post(`/api/v1/connections/accept/${targetUserId}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired token');
    });
  });

  describe('DELETE /api/v1/connections/my-network/invitation-manager/ignore/:user_id', () => {
    it('should allow a user to ignore a received connection request', async () => {
      // Set up received connection request
      await users.findByIdAndUpdate(viewer__id, {
        $push: { received_connections: { _id: target__id, date: new Date() } },
      });

      const res = await request(app)
        .delete(`/api/v1/connections/my-network/invitation-manager/ignore/${targetUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Connection request ignored successfully.');

      const viewer = await users.findById(viewer__id);
      expect(viewer?.received_connections).toHaveLength(0);
    });

    it('should not allow a user to ignore a non-existent connection request', async () => {
      const res = await request(app)
        .delete(`/api/v1/connections/my-network/invitation-manager/ignore/${targetUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('No received connection request from this user.');
    });

    it('should handle unauthorized requests', async () => {
      const res = await request(app)
        .delete(`/api/v1/connections/my-network/invitation-manager/ignore/${targetUserId}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired token');
    });
  });

  describe('DELETE /api/v1/connections/my-network/connections/remove/:user_id', () => {
    it('should allow a user to remove a connection', async () => {
      // Set up connection
      await users.findByIdAndUpdate(viewer__id, {
        $push: { connections: { _id: target__id, date: new Date() } },
      });
      await users.findByIdAndUpdate(target__id, {
        $push: { connections: { _id: viewer__id, date: new Date() } },
      });

      const res = await request(app)
        .delete(`/api/v1/connections/my-network/connections/remove/${targetUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Connection removed successfully.');

      const viewer = await users.findById(viewer__id);
      const target = await users.findById(target__id);

      expect(viewer?.connections).toHaveLength(0);
      expect(target?.connections).toHaveLength(0);
    });

    it('should not allow a user to remove a non-existent connection', async () => {
      const res = await request(app)
        .delete(`/api/v1/connections/my-network/connections/remove/${targetUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('This user is not in your connections list.');
    });

    it('should handle unauthorized requests', async () => {
      const res = await request(app)
        .delete(`/api/v1/connections/my-network/connections/remove/${targetUserId}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired token');
    });
  });

  describe('DELETE /api/v1/connections/my-network/invitation-manager/withdraw/:user_id', () => {
    it('should allow a user to withdraw a sent connection request', async () => {
      // Set up sent connection request
      await users.findByIdAndUpdate(viewer__id, {
        $push: { sent_connections: { _id: target__id, date: new Date() } },
      });
      await users.findByIdAndUpdate(target__id, {
        $push: { received_connections: { _id: viewer__id, date: new Date() } },
      });

      const res = await request(app)
        .delete(`/api/v1/connections/my-network/invitation-manager/withdraw/${targetUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Connection request withdrawn successfully.');

      const viewer = await users.findById(viewer__id);
      const target = await users.findById(target__id);

      expect(viewer?.sent_connections).toHaveLength(0);
      expect(target?.received_connections).toHaveLength(0);
    });

    it('should not allow a user to withdraw a non-existent connection request', async () => {
      const res = await request(app)
        .delete(`/api/v1/connections/my-network/invitation-manager/withdraw/${targetUserId}`)
        .set('Authorization', viewerToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('No sent connection request to this user.');
    });

    it('should add the target user to the withdrawn_connections list with the current date', async () => {
      // Set up sent connection request
      await users.findByIdAndUpdate(viewer__id, {
        $push: { sent_connections: { _id: target__id, date: new Date() } },
      });
      await users.findByIdAndUpdate(target__id, {
        $push: { received_connections: { _id: viewer__id, date: new Date() } },
      });
    
      const res = await request(app)
        .delete(`/api/v1/connections/my-network/invitation-manager/withdraw/${targetUserId}`)
        .set('Authorization', viewerToken);
    
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Connection request withdrawn successfully.');
    
      const viewer = await users.findById(viewer__id);
      const withdrawnConnection = viewer?.withdrawn_connections.find(
        (withdrawn: any) => withdrawn._id.toString() === target__id.toString() // Ensure consistent comparison
      );
    
      expect(withdrawnConnection).toBeDefined();
      expect(withdrawnConnection?.date).toBeDefined();
    });

    it('should handle unauthorized requests', async () => {
      const res = await request(app)
        .delete(`/api/v1/connections/my-network/invitation-manager/withdraw/${targetUserId}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired token');
    });
  });

  describe('POST /api/v1/connections/connect/:user_id', () => {
    it('should not allow a non-subscribed user to send a connection request if total connections exceed 50', async () => {
      // Set up 50 connections for the viewer user
      const connections = Array.from({ length: 50 }, (_, i) => ({
        _id: new mongoose.Types.ObjectId(),
        date: new Date(),
      }));
  
      await users.findByIdAndUpdate(viewer__id, {
        $set: { connections, subscription: { subscribed: false } },
      });
  
      const res = await request(app)
        .post(`/api/v1/connections/connect/${targetUserId}`)
        .set('Authorization', viewerToken);
  
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('You have reached the maximum number of connections allowed for non-subscribed users.');
    });
  
    it('should allow a subscribed user to send a connection request regardless of the number of connections', async () => {
      // Set up 50 connections for the viewer user
      const connections = Array.from({ length: 50 }, (_, i) => ({
        _id: new mongoose.Types.ObjectId(),
        date: new Date(),
      }));
  
      await users.findByIdAndUpdate(viewer__id, {
        $set: { connections, subscription: { subscribed: true } },
      });
  
      const res = await request(app)
        .post(`/api/v1/connections/connect/${targetUserId}`)
        .set('Authorization', viewerToken);
  
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Connection request sent successfully.');
    });
  });

});