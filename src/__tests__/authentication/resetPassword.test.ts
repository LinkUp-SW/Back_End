import request from 'supertest';
import express from 'express';
import { connectToDatabase, disconnectFromDatabase } from '../../../config/database.ts';
import resetPasswordRoutes from '../../../src/routes/resetPassword.routes.ts';
import users, { sexEnum, statusEnum } from '../../../src/models/users.model.ts';
import tokenUtils from '../../utils/token.utils.ts';

const app = express();
app.use(express.json());
app.use('/api/v1/user', resetPasswordRoutes);

describe('Reset Password API', () => {
    let token: string;
    let userId: string;

    beforeAll(async () => {
        await connectToDatabase();

        // Create a mock user with all required fields
        const user: any = await users.create({

            user_id:"test_test",
            email: 'test@example.com',
            password: 'OldPass@1234',
            status:statusEnum.finding_new_job,
            sex:sexEnum.male,
            is_16_or_above:true,
            is_verified:true,
            is_student:false
        });

        userId = user._id.toString(); 
        token = tokenUtils.createToken({ time: '1h', userID: user.user_id });
    });

    afterAll(async () => {
        await users.findByIdAndDelete(userId);
        await disconnectFromDatabase();
    });

    it('should return 400 if no token is provided', async () => {
        const response = await request(app)
            .patch('/api/v1/user/reset-password')
            .send({ 
                password: 'NewPass@1234' });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Token and new password are required');
    });

    it('should return 401 if token is invalid', async () => {
        const response = await request(app)
            .patch('/api/v1/user/reset-password')
            .send({ 
                token: 'token',
                password: 'NewPass@1234' });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid or expired token');
    });

    it('should reset password successfully with a valid token', async () => {
        const response = await request(app)
            .patch('/api/v1/user/reset-password')
            .send({ 
                token: token,
                password: 'NewPass@1234' });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Password reset successful');
    });
});
