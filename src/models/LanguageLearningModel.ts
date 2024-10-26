import mongoose, { Connection, Model, Schema } from "mongoose";
import dbConfig from "../config/db.config";

const connection: Connection = mongoose.createConnection(dbConfig.URL);

export enum UserRole {
  User = "User",
  Admin = "Admin",
}

export enum ETimeEntry {
  work = "work",
  project = "project",
  pause = "pause",
}

// Base interface for all models
export interface IBaseModel {
  _id: string;
  user: string | IUser;
  name: string;
  description: string;
  //tags?: ITag[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser extends IBaseModel {
  email: string;
  password: string;
  role: UserRole;
  isAdmin: boolean;
}

// User Schema
const UserSchema: Schema = new Schema({
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
const User: Model<IUser> = connection.model<IUser>("User", UserSchema);


export { User };
