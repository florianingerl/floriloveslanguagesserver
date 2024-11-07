"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const mongodb_1 = require("mongodb");
const routes_1 = __importDefault(require("./routes"));
const db_config_1 = __importDefault(require("./src/config/db.config"));
const corsOptions = { origin: db_config_1.default.CORS, credentials: true };
const app = (0, express_1.default)();
const client = new mongodb_1.MongoClient(db_config_1.default.URL);
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Use the routes
app.use("/", routes_1.default);
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield client.connect();
        }
        catch (err) {
            console.error("Error in run function:", err.stack);
        }
        finally {
            //const db = client.db("test");
            //console.log("I have connected to the test database!");
            // await db.dropDatabase();
            yield client.close();
            console.log("MongoDB client closed");
        }
    });
}
run().catch(console.error);
app.listen(8080, () => __awaiter(void 0, void 0, void 0, function* () {
    // await testDB();
    // await initDB();
    console.log(`Server is running on port ${8080}`);
}));
