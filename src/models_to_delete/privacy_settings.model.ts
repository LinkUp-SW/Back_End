import mongoose, { Schema } from "mongoose";

export enum invitationsEnum{
    everyone = "Everyone",
    email = "email",

}

export enum accountStatusEnum{
    public = "Public",
    private = "Private",
    connections = "Connections only"
}

export interface privacySettingsInterface extends mongoose.Document{
    flag_account_status: accountStatusEnum;
    flag_who_can_send_you_invitations: invitationsEnum;
    flag_messaging_requests: boolean;
    messaging_read_receipts: boolean;
}

const privacySettingsSchema = new Schema<privacySettingsInterface>({
    flag_account_status:{ type: String, enum: Object.values(accountStatusEnum), required: true },
    flag_who_can_send_you_invitations:{ type: String, enum: Object.values(invitationsEnum), required: true },
    flag_messaging_requests:{ type: Boolean, required: true },
    messaging_read_receipts:{ type: Boolean, required: true },
})

const privacy_settings =  mongoose.model<privacySettingsInterface>('privacy_settings', privacySettingsSchema);

export default privacy_settings;