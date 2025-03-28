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

describe('Get Sent and Received Connection Requests', () => {
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

  describe('GET /api/v1/connections/my-network/invitation-manager/sent', () => {
    it('should return the list of sent connection requests', async () => {
      // Set up sent connection request
      await users.findByIdAndUpdate(viewer__id, {
        $push: { sent_connections: { _id: target__id, date: new Date() } },
      });
      await users.findByIdAndUpdate(target__id, {
        $push: { received_connections: { _id: viewer__id, date: new Date() } },
      });

      const res = await request(app)
        .get('/api/v1/connections/my-network/invitation-manager/sent')
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.sentConnections).toHaveLength(1);
      expect(res.body.sentConnections[0].user_id).toBe(targetUserId);
    });

    it('should return an empty list if no sent connection requests exist', async () => {
      const res = await request(app)
        .get('/api/v1/connections/my-network/invitation-manager/sent')
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.sentConnections).toHaveLength(0);
    });

    it('should handle unauthorized requests', async () => {
      const res = await request(app)
        .get('/api/v1/connections/my-network/invitation-manager/sent');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthorized');
    });
  });

  describe('GET /api/v1/connections/my-network/invitation-manager/received', () => {
    it('should return the list of received connection requests', async () => {
      // Set up received connection request
      await users.findByIdAndUpdate(viewer__id, {
        $push: { received_connections: { _id: target__id, date: new Date() } },
      });
      await users.findByIdAndUpdate(target__id, {
        $push: { sent_connections: { _id: viewer__id, date: new Date() } },
      });

      const res = await request(app)
        .get('/api/v1/connections/my-network/invitation-manager/received')
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.receivedConnections).toHaveLength(1);
      expect(res.body.receivedConnections[0].user_id).toBe(targetUserId);
    });

    it('should return an empty list if no received connection requests exist', async () => {
      const res = await request(app)
        .get('/api/v1/connections/my-network/invitation-manager/received')
        .set('Authorization', viewerToken);

      expect(res.status).toBe(200);
      expect(res.body.receivedConnections).toHaveLength(0);
    });

    it('should handle unauthorized requests', async () => {
      const res = await request(app)
        .get('/api/v1/connections/my-network/invitation-manager/received');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthorized');
    });


    });

    describe('GET /api/v1/connections/my-network/invite-connect/connections', () => {
        it('should return the list of all connections', async () => {
          // Set up connection
          await users.findByIdAndUpdate(viewer__id, {
            $push: { connections: { _id: target__id, date: new Date() } },
          });
          await users.findByIdAndUpdate(target__id, {
            $push: { connections: { _id: viewer__id, date: new Date() } },
          });
    
          const res = await request(app)
            .get('/api/v1/connections/my-network/invite-connect/connections')
            .set('Authorization', viewerToken);
    
          expect(res.status).toBe(200);
          expect(res.body.connections).toHaveLength(1);
          expect(res.body.connections[0].user_id).toBe(targetUserId);
        });
    
        it('should return an empty list if the user has no connections', async () => {
          const res = await request(app)
            .get('/api/v1/connections/my-network/invite-connect/connections')
            .set('Authorization', viewerToken);
    
          expect(res.status).toBe(200);
          expect(res.body.connections).toHaveLength(0);
        });
    
        it('should handle unauthorized requests', async () => {
          const res = await request(app)
            .get('/api/v1/connections/my-network/invite-connect/connections');
    
          expect(res.status).toBe(401);
          expect(res.body.message).toBe('Unauthorized');
        });
    
        it('should return connections sorted by the most recent first', async () => {
          // Store a consistent user_id for the second target user
          const secondTargetUserId = `second-target-${Date.now()}`;
          const secondTargetUser = await users.create({
            user_id: secondTargetUserId,
            email: `second-target-${Date.now()}@example.com`,
            password: 'password123',
            is_verified: true,
          });
        
          const secondTarget__id = secondTargetUser._id as string;
        
          // Set up connections with different dates
          await users.findByIdAndUpdate(viewer__id, {
            $push: { connections: { _id: target__id, date: new Date('2023-01-01') } },
          });
          await users.findByIdAndUpdate(viewer__id, {
            $push: { connections: { _id: secondTarget__id, date: new Date('2023-02-01') } },
          });
        
          const res = await request(app)
            .get('/api/v1/connections/my-network/invite-connect/connections')
            .set('Authorization', viewerToken);
        
          expect(res.status).toBe(200);
          expect(res.body.connections).toHaveLength(2);
          expect(res.body.connections[0].user_id).toBe(secondTargetUserId); // Use the stored user_id
          expect(res.body.connections[1].user_id).toBe(targetUserId);
        
          await users.findByIdAndDelete(secondTarget__id);
        });
        });


});