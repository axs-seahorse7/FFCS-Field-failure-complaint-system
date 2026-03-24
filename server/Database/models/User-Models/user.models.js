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
    status: {
        type: String,
        enum: ["active", "pending", "suspended"],
        default: "pending"
    },
    stats:{
        totalComplaints: {
            type: Number,
            default: 0
        },
        pendingComplaints: {
            type: Number,
            default: 0
        },
        resolvedComplaints: {
            type: Number,
            default: 0
        },
    },
    isBlocked: {
        type: Boolean,
        default: false
    },

    isDeleted: {
        type: Boolean,
        default: false
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;