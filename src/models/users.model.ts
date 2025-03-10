import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

export interface usersInterface extends mongoose.Document{
    name: string;
    email: string;
    password: string;
    phone_number: number;
    country_code: string;
    comparePassword: (password: string) => Promise<boolean>;
}

const usersSchema = new Schema<usersInterface>({
    name: { type: String, required: true},
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        validate: {
            validator: function(v: string) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: props => `${props.value} is not a valid email!`
        }
    },
    password: { type: String, required: true},
    phone_number: { type: Number},
    country_code: { type: String }
})

usersSchema.pre('save', async function(next) {
    const user = this as usersInterface;
    if (!user.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        next();
    } catch (err:any) {
        next(err);
    }
});

usersSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
}

const users = mongoose.model<usersInterface>('users', usersSchema);

export default users;