import mongoose from "mongoose";
import privacy_settings, { invitationsEnum, accountStatusEnum } from "../../models_to_delete/privacy_settings.model.ts";

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || "");
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe("Privacy Settings Model", () => {
    it("should create a privacy setting successfully", async () => {
        const privacySetting = new privacy_settings({
            flag_account_status: accountStatusEnum.public,
            flag_who_can_send_you_invitations: invitationsEnum.everyone,
            flag_messaging_requests: false,
            messaging_read_receipts: true,
        });

        await expect(privacySetting.save()).resolves.toBeDefined();
    });

    it("should not create a privacy setting without required fields", async () => {
        const privacySetting = new privacy_settings({
            flag_account_status: accountStatusEnum.private,
            flag_messaging_requests: true,
            messaging_read_receipts: true,
        });

        await expect(privacySetting.save()).rejects.toThrow();
    });

    it("should not create a privacy setting with invalid enum value", async () => {
        const privacySetting = new privacy_settings({
            flag_account_status: "InvalidValue",
            flag_who_can_send_you_invitations: "InvalidValue",
            flag_messaging_requests: true,
            messaging_read_receipts: true,
        });

        await expect(privacySetting.save()).rejects.toThrow();
    });
});