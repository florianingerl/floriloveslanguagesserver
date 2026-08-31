import mongoose, { Connection, Model, Schema } from "mongoose";
import dbConfig from "../config/db.config";

const connection: Connection = mongoose.createConnection(dbConfig.URL);

export enum UserRole {
  User = "User",
  Admin = "Admin",
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

export interface IExercise extends IBaseModel {
  instruction: string;
  imageUrl: string,
  topics: [string];
  type: string;
  gapText: string;
  options: [string];
}

export interface IUser extends IBaseModel {
  email: string;
  password: string;
  role: UserRole;
  isAdmin: boolean;
}

export interface IDict extends IBaseModel {
   name: string;
   url: string;
};

export interface IDictPref extends IBaseModel {
   dict: Schema.Types.ObjectId;
   dictUrl: string;
   userEmail : string;
   lg: string;
};

const DictPrefSchema : Schema = new Schema({
  dict: { type: Schema.Types.ObjectId, ref: 'Dict' },
  dictUrl: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User'},
  userEmail: { type: String, required: true },
  lg: { type: String, required: true, enum: ['french', 'english', 'deutsch', 'espagnol','italiano'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const DictSchema : Schema = new Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const ExerciseSchema: Schema = new Schema({
  instruction: {type: String, required: true },
  imageUrl: {type: String, required: true},
   topics: {type: [String], required: true},
   type: {type: String, required: true},
   gapText: {type: String, required: false},
   options: {type: [String], required: false},
   createdAt: { type: Date, default: Date.now },
   updatedAt: { type: Date, default: Date.now },
}

);

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
const Exercise: Model<IExercise> = connection.model<IExercise>("Exercise", ExerciseSchema);
const User: Model<IUser> = connection.model<IUser>("User", UserSchema);
const Dict: Model<IDict> = connection.model<IDict>("Dict", DictSchema);
const DictPref : Model<IDictPref> = connection.model<IDictPref>("DictPref", DictPrefSchema );


export { Exercise, User, Dict, DictPref };
