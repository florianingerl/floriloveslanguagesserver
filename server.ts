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
import { attachBookCollaboration } from "./src/bookCollaboration/socket";
import { Request, Response} from "express";

console.log(process.env.MONGODB_URL);


interface CorsOptions {
  origin: string;
  credentials: boolean;
}


const corsOptions: CorsOptions = { origin: dbConfig.CORS, credentials: true };
const app = express();


app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use the routes
app.use("/", routes);

console.log("Testing whether we can connect to the MONGO DB database at " + dbConfig.URL);
const client = new MongoClient(dbConfig.URL);
//const client = new MongoClient("mongodb+srv://flori:ABC@cluster0.p9bpe.mongodb.net/");
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

// Express bleibt die HTTP-Schicht, socket.io reitet auf demselben Server.
// "fragfloriancollaborationserver" sitzt also hier in server.ts und teilt
// sich in die beiden Aufgaben mit jeweils einem eigenen Ordner:
//   src/threeInARow/        Spiel "Three-in-a-row"
//   src/bookCollaboration/  Gemeinsames Schreiben von Buechern
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: { origin: dbConfig.CORS, methods: ["GET", "POST"] },
});
attachThreeInARow(io);
attachBookCollaboration(io);

httpServer.listen(PORT, async () => {
  // await testDB();
  // await initDB();
  console.log(`Server is running on port ${PORT}`);
});
