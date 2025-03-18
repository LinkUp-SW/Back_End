import request from 'supertest';
import express from 'express';
import { connectToDatabase, disconnectFromDatabase } from '../../../config/database.ts';
import forgetPasswordRoutes from '../../../src/routes/forgetPassword.routes.ts';
import users from '../../../src/models/users.model.ts';

const app = express();
app.use(express.json());
app.use('/api/v1/user', forgetPasswordRoutes);

// Test suite for forget password functionality
describe('Forget Password API', () => {
    beforeAll(async () => {
        await connectToDatabase();
    });

    afterAll(async () => {
        await disconnectFromDatabase();
    });


    it('should return 400 if email format is invalid', async () => {
        const response = await request(app)
            .post('/api/v1/user/forget-password')
            .send({ email: 'invalidemail' });
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid email format');
    });

    it('should return 404 if email is not registered', async () => {
        const response = await request(app)
            .post('/api/v1/user/forget-password')
            .send({ email: 'nonexistent@example.com' });
        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Email not registered');
    });

    it('should send reset password email for registered user', async () => {
    
        const response = await request(app)
            .post('/api/v1/user/forget-password')
            .send({ email: 'jane.smith@example.com' });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Password reset link sent to your email');
    });
});
