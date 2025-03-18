import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import { connectToDatabase, disconnectFromDatabase } from '../../../config/database.ts';
import updatePasswordRoutes from '../../../src/routes/updatePassword.routes.ts';
import users, { sexEnum, statusEnum } from '../../../src/models/users.model.ts';
import tokenUtils from '../../utils/token.utils.ts';

const app = express();
app.use(express.json());
app.use('/api/v1/user', updatePasswordRoutes);

describe('Update Password API', () => {
    let token: string;
    let userId: string;

    beforeAll(async () => {
        await connectToDatabase();

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

    it('should return 400 if required fields are missing', async () => {
        const response = await request(app)
            .patch('/api/v1/user/update-password')
            .send({});
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Token and password are required');
    });

    it('should return 403 if old password is incorrect', async () => {
        const response = await request(app)
            .patch('/api/v1/user/update-password')
            .send({ token, old_password: 'WrongPass123', new_password: 'NewPass@1234' });

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Old password is incorrect');
    });

    it('should return 403 if token is invalid', async () => {
        const response = await request(app)
            .patch('/api/v1/user/update-password')
            .send({ token: 'invalidtoken', old_password: 'OldPass@1234', new_password: 'NewPass@1234' });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid or expired token');
    });

    it('should update the password successfully', async () => {
        const response = await request(app)
            .patch('/api/v1/user/update-password')
            .send({ token, old_password: 'OldPass@1234', new_password: 'NewPass@5678' });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Password updated successfully');

        // Verify the password is actually changed in the database
        const updatedUser = await users.findById(userId);
        if (!updatedUser) {
            throw new Error('User not found');
        }
        const isPasswordUpdated = await bcrypt.compare('NewPass@5678', updatedUser.password);
        expect(isPasswordUpdated).toBe(true);
    });
});
