import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true, // keeps consistency: "Admin" → "admin"
    },

    description: {
      type: String,
      default: "",
    },

    permissions: [
      {
        type: String,
        required: true,
      },
    ],

    action:[
        {
            type: String,
            required: true,
        }
    ],

    isDefault: {
      type: Boolean,
      default: false, // for default role (e.g. "user")
    },

    isActive: {
      type: Boolean,
      default: true, // soft disable role
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Role", roleSchema);