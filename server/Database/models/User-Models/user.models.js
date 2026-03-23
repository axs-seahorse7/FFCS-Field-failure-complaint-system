import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    role: {
        type: String,
        enum: ["admin", "user"],
        default: "user"
    },
    otp: { 
        type: String, 
    },
    otpExpiresAt: {
        type: Date,
    },
    isBlocked: {
        type: Boolean,
        default: false
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;