import request from 'supertest';
import express from 'express';
import { connectToDatabase, disconnectFromDatabase } from '../../../config/database.ts';
import updateUsernameRoutes from '../../routes/authentication/updateUsername.routes.ts';
import users, { sexEnum, statusEnum } from '../../models/users.model.ts';
import tokenUtils from '../../utils/token.utils.ts';

const app = express();
app.use(express.json());
app.use('/api/v1/user', updateUsernameRoutes);

describe('Update Username API', () => {
    let token: string;
    let userId: string;
    let userId2: string;
    beforeAll(async () => {
        await connectToDatabase();

        // Create a mock user
        const user: any = await users.create({
            user_id:"test_old",
            email: 'test@example.com',
            password: 'OldPass@1234',
            status:statusEnum.finding_new_job,
            sex:sexEnum.male,
            is_16_or_above:true,
            is_verified:true,
            is_student:false
        });

        const user2: any = await users.create({
            user_id:"test_old2",
            email: 'test2@example.com',
            password: 'Old2Pass@1234',
            status:statusEnum.finding_new_job,
            sex:sexEnum.male,
            is_16_or_above:true,
            is_verified:true,
            is_student:false
        });


        userId = user._id.toString();
        userId2=user2._id.toString();
        token = tokenUtils.createToken({ time: '1h', userID: user.user_id });
    });

    afterAll(async () => {
        await users.findByIdAndDelete(userId);
        await users.findByIdAndDelete(userId2);
        await disconnectFromDatabase();
    });

    it('should return 400 if required fields are missing', async () => {
        const response = await request(app)
            .patch('/api/v1/user/update-username')
            .send({});
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Token and new username are required');
    });

    it('should return 401 if token is invalid', async () => {
        const response = await request(app)
            .patch('/api/v1/user/update-username')
            .send({ token: 'invalidtoken', new_username: 'newUsername' });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid or expired token');
    });

    it('should return 403 if username already in use', async () => {
        const response = await request(app)
            .patch('/api/v1/user/update-username')
            .send({ token, new_username: 'test_old2' });
        
        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Username already in use');

    });

    
    it('should update the username successfully', async () => {
        const response = await request(app)
            .patch('/api/v1/user/update-username')
            .send({ token, new_username: 'new_username' });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('User name updated successfully');

        const updatedUser = await users.findById(userId);
        expect(updatedUser?.user_id).toBe('new_username');
    });
});
