export const dbConfig = {
  HOST: "localhost",
  PORT: "", // Not needed for MongoDB Atlas
  USER: "",
  PASSWORD: "",
  DB: "nekaGit",
  URL: "mongodb://127.0.0.1:27017/test",
  //URL: "mongodb+srv://njoco:OZCYn16yxbOtjQ2x@cluster0.dkvowsi.mongodb.net/", // Include the DB name in the URL
  JWT_SECRET: "applepen", // Add a JWT secret for token signing
  CORS: "*", // Allow all origins
};

export default dbConfig;