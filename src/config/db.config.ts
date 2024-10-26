export const dbConfig = {
  HOST: "localhost",
  PORT: "", // Not needed for MongoDB Atlas
  USER: "",
  PASSWORD: "",
  DB: "nekaGit",
  URL: "mongodb+srv://:@cluster0.dkvowsi.mongodb.net/nekaGit", // Include the DB name in the URL
  JWT_SECRET: "applepen", // Add a JWT secret for token signing
  CORS: "*", // Allow all origins
};

export default dbConfig;
