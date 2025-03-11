import request, { SuperAgentTest } from 'supertest';
import express from 'express';
import session from 'express-session';
import otpRoutes from '../../../src/routes/otp.routes.ts';
import * as otpService from '../../../src/services/otp.service.ts';

const app = express();

// Configure middleware
app.use(express.json());
app.use(
  session({
    secret: 'testsecret',
    resave: false,
    saveUninitialized: true,
  })
);

// Mount the OTP routes under /api/v1/otp
app.use('/api/v1/user', otpRoutes);

describe('OTP Routes', () => {
    let agent = request.agent(app);

  beforeEach(() => {
    agent = request.agent(app);
  });

  // Stub generateOTPCode and sendOTPCode for predictable behavior and to prevent external calls
  beforeAll(() => {
    jest.spyOn(otpService, 'generateOTPCode').mockReturnValue(123456);
    jest.spyOn(otpService, 'sendOTPCode').mockImplementation(async () => Promise.resolve());
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('POST /send-otp', () => {
    it('should return 400 if email is missing', async () => {
      const res = await agent.post('/api/v1/user/send-otp').send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Email is required');
    });

    it('should generate OTP, send it and store data in session', async () => {
      const res = await agent
        .post('/api/v1/user/send-otp')
        .send({ email: 'test@example.com', phone: '1234567890' });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('OTP has been sent to your email');
      // A subsequent request (using the same agent) will have access to the session variables set by the OTP endpoint.
    });
  });

  describe('POST /verify-otp', () => {
    it('should return 400 if email or OTP is missing', async () => {
      let res = await agent.post('/api/v1/user/verify-otp').send({ otp: '123456' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Email and OTP are required');

      res = await agent.post('/api/v1/user/verify-otp').send({ email: 'test@example.com' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Email and OTP are required');
    });

    it('should verify OTP successfully', async () => {
      // Generate the OTP first (which sets session values)
      await agent
        .post('/api/v1/user/send-otp')
        .send({ email: 'test@example.com', phone: '1234567890' })
        .expect(200);

      // Now verify using the correct OTP (123456)
      const res = await agent
        .post('/api/v1/user/verify-otp')
        .send({ email: 'test@example.com', otp: '123456' });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('OTP verified successfully');
    });

    it('should reject invalid OTP', async () => {
      // Generate the OTP first
      await agent
        .post('/api/v1/user/send-otp')
        .send({ email: 'test@example.com', phone: '1234567890' })
        .expect(200);

      // Now verify with an incorrect OTP
      const res = await agent
        .post('/api/v1/user/verify-otp')
        .send({ email: 'test@example.com', otp: '000000' });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid OTP');
    });

    it('should reject expired OTP', async () => {
      // Generate the OTP first
      await agent
        .post('/api/v1/user/send-otp')
        .send({ email: 'test@example.com', phone: '1234567890' })
        .expect(200);

      // Simulate OTP expiration by overriding Date.now() temporarily.
      const originalDateNow = Date.now;
      Date.now = () => originalDateNow() + 11 * 60 * 1000; // 11 minutes later

      const res = await agent
        .post('/api/v1/user/verify-otp')
        .send({ email: 'test@example.com', otp: '123456' });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('OTP expired');

      // Restore Date.now()
      Date.now = originalDateNow;
    });
  });
});
