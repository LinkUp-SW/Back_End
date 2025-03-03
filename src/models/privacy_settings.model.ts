import mongoose, { Schema } from "mongoose";


export interface privacySettingsInterface extends mongoose.Document{
    flag_account_status: boolean;
    flag_who_can_send_you_invitations: Enumerator;
    flag_messaging_requests: Enumerator;
    messaging_read_receipts: boolean;
}

const privacySettingsSchema = new Schema<privacySettingsInterface>({
    flag_account_status:{ type: Boolean, required: true },
    flag_who_can_send_you_invitations:{ type: Enumerator, required: true },
    flag_messaging_requests:{ type: Enumerator, required: true },
    messaging_read_receipts:{ type: Boolean, required: true },
})

const privacy_settings =  mongoose.model<privacySettingsInterface>('privacy_settings', privacySettingsSchema);

export default privacy_settings;