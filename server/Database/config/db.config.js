import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const NODE_ENV = process.env.NODE_ENV 
    let mongoURI;

    if (NODE_ENV === "production") {
      // MongoDB Cloud (Atlas) connection for production
      mongoURI = process.env.MONGODB_CLOUD_URI;
      
      if (!mongoURI) {
        throw new Error("MONGODB_CLOUD_URI is not defined in environment variables");
      }
      
      console.log("Connecting to MongoDB Cloud (Production)...");
    } else {
      // Local MongoDB connection for development
      mongoURI =
        process.env.MONGODB_LOCAL_URI ||
        "mongodb://localhost:27017/fdr-react";
      
      console.log("Connecting to Local MongoDB (Development)...");
    }

    const conn = await mongoose.connect(mongoURI, );

    console.log(
      `MongoDB Connected Successfully: ${conn.connection.host}`,
      `\nEnvironment: ${NODE_ENV}`
    );

    return conn;
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

export default connectDB;
