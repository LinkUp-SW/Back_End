import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import { connectToDatabase, disconnectFromDatabase } from '../../../config/database.ts';
import loginRoutes from '../../../src/routes/login.routes.ts';
import users from '../../../src/models/users.model.ts'; // Adjust the path as needed

const app = express();

// Configure middleware
app.use(express.json());

// Mount the login routes under /api/v1/auth
app.use('/api/v1/user', loginRoutes);

// add timeout to avoid jest open handle error
jest.setTimeout(10000);

describe('Auth Routes', () => {
  // Seed test user with a hashed password before tests run
  beforeAll(async () => {
    await connectToDatabase();
    const testUser = await users.create({
      name: 'Valid Name',  
      email: 'user@example.com',
      password: 'valid_password',
    });
    await testUser.save();
  });

  // Clean up test data after tests complete
  afterAll(async () => {
    await users.deleteOne({ email: 'user@example.com' });
    await disconnectFromDatabase();
  });

  it('should log in a user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'user@example.com',
        password: 'valid_password',
      })
      .expect(200);

    expect(res.body.message).toBe('Login successful');
    expect(res.header['set-cookie']).toBeDefined(); // Verify that a JWT cookie is set
  });

  it('should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'invalid@example.com',
        password: 'wrong_password',
      })
      .expect(401);

    expect(res.body.message).toBe('Invalid credentials');
  });

  it('should log out a user', async () => {
    const agent = request.agent(app); // Use an agent to persist cookies

    // Log in first
    await agent
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'valid_password' })
      .expect(200);

    // Log out
    const res = await agent
      .get('/api/v1/auth/logout')
      .expect(200);

    expect(res.body.message).toBe('Logout successful');
    // Depending on how the cookie is cleared, further assertions may be needed.
  });
});
