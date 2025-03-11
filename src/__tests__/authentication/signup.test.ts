import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { connectToDatabase, disconnectFromDatabase } from '../../../config/database.ts';
import signupRoutes from '../../../src/routes/signup.routes.ts';
import User from '../../../src/models/users.model.ts';

const app = express();
app.use(express.json());
app.use(
  session({
    secret: 'testsecret',
    resave: false,
    saveUninitialized: true,
  })
);
app.use('/api/v1/user', signupRoutes);

jest.setTimeout(40000);

beforeAll(async () => {
  await connectToDatabase();
});

afterAll(async () => {
    await User.deleteOne({ email: 'user@example.com' });
    await disconnectFromDatabase();
  });

describe('Signup Routes', () => {
  it('should return 400 if email or password is missing', async () => {
    const res = await request(app).post('/api/v1/user/signup').send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email and password are required');
  });

  it('should signup a new user successfully', async () => {
    const res = await request(app)
      .post('/api/v1/user/signup')
      .send({ email: 'newuser@example.com', password: 'securepassword' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Signup successful');
    expect(res.body.user.email).toBe('newuser@example.com');
  });

  it('should return 409 if user already exists', async () => {
    // First, create a user
    await request(app)
      .post('/api/v1/user/signup')
      .send({ email: 'duplicate@example.com', password: 'password123' })
      .expect(201);

    // Try creating the same user again
    const res = await request(app)
      .post('/api/v1/user/signup')
      .send({ email: 'duplicate@example.com', password: 'password123' });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('User already exists');
  });
});

