import bcrypt from "bcrypt";
import users from "../../models/users.model.ts";
import mongoose from "mongoose";


beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});

beforeEach(async () => {
    await users.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe("User Model", () => {

    it("should create a user successfully", async () => {
        const user = new users({
            name: "John Doe",
            email: "johndoe@example.com",
            password: "securepassword",
            phone_number: 1234567890,
            country_code: "+1"
        });
        
        await expect(user.save()).resolves.toBeDefined();
    }, 15000);

    it("should not allow duplicate emails", async () => {
        await users.create({
            name: "Alice",
            email: "alice@example.com",
            password: "password123",
            phone_number: 9876543210,
            country_code: "+44"
        });
        
        const duplicateUser = new users({
            name: "Bob",
            email: "alice@example.com",
            password: "password456",
            phone_number: 1122334455,
            country_code: "+44"
        });
        
        await expect(duplicateUser.save()).rejects.toThrow();
    }, 15000);

    it("should hash the password before saving", async () => {
        const user = await users.create({
            name: "Charlie",
            email: "charlie@example.com",
            password: "mypassword",
            phone_number: 1010101010,
            country_code: "+91"
        });
        
        expect(await bcrypt.compare("mypassword", user.password)).toBe(true);
    }, 30000);

    it("should require all necessary fields", async () => {
        const user = new users({});
        await expect(user.save()).rejects.toThrow();
    }, 15000);
});
