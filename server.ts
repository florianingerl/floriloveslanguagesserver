import cors from "cors";
import express from "express";
import { MongoClient } from "mongodb";
import routes from "./routes";
import dbConfig from "./src/config/db.config";
import testDB from "./src/helpers/testDB";
import initDB from "./src/helpers/initDB";

interface CorsOptions {
  origin: string;
  credentials: boolean;
}

const corsOptions: CorsOptions = { origin: dbConfig.CORS, credentials: true };
const app = express();
const client = new MongoClient(dbConfig.URL);

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use the routes
app.use("/", routes);

async function run(): Promise<void> {
  try {
    await client.connect();
  } catch (err) {
    console.error("Error in run function:", (err as Error).stack);
  } finally {
    //const db = client.db("test");
    //console.log("I have connected to the test database!");
    // await db.dropDatabase();
    await client.close();
    console.log("MongoDB client closed");
  }
}


run().catch(console.error);

app.listen(8080, async () => {
  // await testDB();
  // await initDB();
  console.log(`Server is running on port ${8080}`);
});
