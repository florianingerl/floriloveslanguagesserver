"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DictPref = exports.Dict = exports.User = exports.UserRole = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const db_config_1 = __importDefault(require("../config/db.config"));
const connection = mongoose_1.default.createConnection(db_config_1.default.URL);
var UserRole;
(function (UserRole) {
    UserRole["User"] = "User";
    UserRole["Admin"] = "Admin";
})(UserRole || (exports.UserRole = UserRole = {}));
;
;
const DictPrefSchema = new mongoose_1.Schema({
    dictUrl: { type: String, required: true },
    userEmail: { type: String, required: true },
    lg: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
const DictSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    url: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
// User Schema
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
    isAdmin: { type: Boolean, required: true },
    // tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
// Export the models
const User = connection.model("User", UserSchema);
exports.User = User;
const Dict = connection.model("Dict", DictSchema);
exports.Dict = Dict;
const DictPref = connection.model("DictPref", DictPrefSchema);
exports.DictPref = DictPref;
