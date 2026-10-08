import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { MongoClient } from "mongodb";
import routes from "./routes";
import dbConfig from "./src/config/db.config";
import testDB from "./src/helpers/testDB";
import initDB from "./src/helpers/initDB";
import { attachThreeInARow } from "./src/threeInARow/socket";
import { Request, Response} from "express";
import 'dotenv/config';

console.log(process.env.MONGODB_URL);


interface CorsOptions {
  origin: string;
  credentials: boolean;
}

console.log(process.env.MONGODB_URL);
const corsOptions: CorsOptions = { origin: dbConfig.CORS, credentials: true };
const app = express();
//const client = new MongoClient(dbConfig.URL);
const client = new MongoClient("mongodb+srv://flori:ABC@cluster0.p9bpe.mongodb.net/");

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

const PORT = Number(process.env.PORT) || 8080;

// Express stays the HTTP layer, socket.io rides on the same server
// (game "Three-in-a-row").
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: { origin: dbConfig.CORS, methods: ["GET", "POST"] },
});
attachThreeInARow(io);

httpServer.listen(PORT, async () => {
  // await testDB();
  // await initDB();
  console.log(`Server is running on port ${PORT}`);
});
