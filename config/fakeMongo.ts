import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

export default async function globalSetup() {
    const instance = await MongoMemoryServer.create();
    const uri = instance.getUri();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).__MONGOINSTANCE = instance;

    // To grant access on the unit test level
    process.env.MONGO_URI = uri;

    await cleanDatabase(uri);
}

const cleanDatabase = async (uri: string) => {
    const connection = await mongoose.connect(uri);

    if (connection.connection && connection.connection.db) {
        await connection.connection.db.dropDatabase();
    } else {
        console.error(
            'Database connection is not established or db is undefined.'
        );
    }

    await mongoose.disconnect();
};