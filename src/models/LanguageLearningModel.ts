import mongoose, { Types, Connection, Model, Schema } from "mongoose";
import dbConfig from "../config/db.config";

const connection: Connection = mongoose.createConnection(dbConfig.URL);

export enum UserRole {
  User = "User",
  Admin = "Admin",
}

// Base interface for all models
export interface IBaseModel {
  _id: string;
  // Kennzeichnet, wer das Dokument angelegt hat. Das Feld ist optional, weil
  // nicht jedes Modell einen Besitzer hat (zum Beispiel Dict).
  user?: string | IUser;
  name: string;
  description: string;
  //tags?: ITag[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IExerciseOption {
  option: string;
  correct: boolean;
}

// Die beiden Haelften eines Satzes in einer matching-Aufgabe.
export interface ITwoPartSentences {
  part1: string;
  part2: string;
}

// Ein Wortreihen-Satz. Das Mischen der Woerter und die Antwort des
// Benutzers passieren nur im Browser, deshalb wird nur der Satz gespeichert.
export interface IWordOrderSentence {
  sentence: string;
}

export interface ITopic extends IBaseModel {
  // Sprache oder Fach, z.B. "deutsch" oder "Mathematik". Das Feld heisst
  // bewusst "subject" (nicht "language").
  subject: string;
  title: string;
  tutorial: String;
  // Das Quiz, in dem das Thema angelegt wurde.
  quiz?: Types.ObjectId;
  // Das uebergeordnete Thema. Fehlt es, ist das Thema eine Wurzel. Damit
  // lassen sich Unterthemen wie "Elektrotechnik->Dioden->Zehnerdiode" bauen.
  parentId?: Types.ObjectId;
}

// Ein Quiz kann zu einer Website ("web") oder zu einem Buch ("book")
// gehoeren. Die Website-Quizze sind die Sprach-/Fachseiten-Quizze ("french",
// "english", "deutsch", ...), deren Fach der alte Erkennungsschluessel ist.
export interface IQuiz {
  _id: string;
  // "web" = Quiz einer Sprache/Fach-Seite, "book" = Quiz innerhalb eines Buchs.
  website: string;
  // Nur bei website === "book": das Buch, in dem das Quiz erscheint.
  book?: Types.ObjectId;
  // Sprache oder Fach, z.B. "deutsch", "Mathematik", "nutrition". Der Wert ist
  // ein freier String, kein Enum. Bei den Website-Quizzen ist das der Name,
  // unter dem der Browser Aufgaben und Themen anfragt.
  subject: string;
  // Anzeige-Name, z.B. "Wortschatz: Sterne".
  name?: string;
  // _id des Benutzers, der das Quiz angelegt hat. Setzt der Server selbst.
  user?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Ein Buchladen buendelt Buecher. Auf der Website steht er fuer eine
// Sprach-/Fachseite (z.B. "Flori's German books" fuer "deutsch").
export interface IBookStore {
  _id: string;
  name: string;
  // Sprache oder Fach, z.B. "deutsch" oder "Mathematik".
  subject: string;
  // Website, auf der der Laden erscheint.
  website: string;
  // _id des Benutzers, der den Laden angelegt hat. Setzt der Server selbst.
  user?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Eine Schule/Hochschule/Klasse, z.B. "9.Klasse Gymnasium Bayern". Die
// Aufgaben tragen ihre Schule ueber die _id dieses Dokuments.
export interface ISchool {
  _id: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBook {
  _id: string;
  name: string;
  // Sprache oder Fach, z.B. "deutsch" oder "Mathematik".
  subject: string;
  // Absaetze des Buchs als HTML-Strings.
  paragraphs: string[];
  // _ids der Quizze in der Reihenfolge, in der sie im Buch erscheinen.
  quizzes: Types.ObjectId[];
  // Der Buchladen, zu dem das Buch gehoert.
  store?: Types.ObjectId;
  // _id des Benutzers, der das Buch angelegt hat. Setzt der Server selbst.
  user?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IExercise extends IBaseModel {
  quiz: Types.ObjectId;
  // Sprache oder Fach, z.B. "deutsch". Setzt der Server aus dem Quiz.
  subject?: string;
  type: string;
  imageUrl: string;
  topic?: Types.ObjectId;
  // Schule/Hochschule/Klasse der Aufgabe. Die Schule steckt in einem eigenen
  // Dokument (School); die Aufgabe speichert dessen _id.
  school?: Types.ObjectId;
  gapText?: string;
  questionOrInstruction: string;
  questionEn?: string;
  questionFr?: string;
  options?: IExerciseOption[];
  optionsEn?: IExerciseOption[];
  optionsFr?: IExerciseOption[];
  // matching
  sentences?: ITwoPartSentences[];
  guessedSentences?: ITwoPartSentences[];
  // word order
  wordorder?: IWordOrderSentence;
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
}

export interface IDictPref extends IBaseModel {
  dict: Schema.Types.ObjectId;
  dictUrl: string;
  userEmail: string;
  lg: string;
}

// Ein Bild, das ein Benutzer aus der Zwischenablage hochgeladen hat. Es wird
// als BSON-Binary in MongoDB gehalten, damit das Backend keinen eigenen
// Dateispeicher (Volume) braucht. Die Anzahl der Uploads pro Tag wird anhand
// von createdAt gezaehlt (siehe ImageController).
export interface IUploadedImage {
  _id: string;
  // Wer das Bild hochgeladen hat.
  user: Types.ObjectId;
  contentType: string;
  data: Buffer;
  createdAt: Date;
}

const DictPrefSchema: Schema = new Schema({
  dict: { type: Schema.Types.ObjectId, ref: "Dict" },
  dictUrl: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: "User" },
  userEmail: { type: String, required: true },
  lg: {
    type: String,
    required: true,
    enum: ["french", "english", "deutsch", "espagnol", "italiano"],
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const DictSchema: Schema = new Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Hochgeladene Bilder. Der Tageszaehler fragt ueber user + createdAt ab,
// deshalb sind beide Felder indiziert.
const UploadedImageSchema: Schema = new Schema({
  user: { type: Types.ObjectId, ref: "User", required: true, index: true },
  contentType: { type: String, required: true },
  data: { type: Buffer, required: true },
  createdAt: { type: Date, default: Date.now, index: true },
});

const ExerciseOptionSchema: Schema = new Schema(
  {
    option: { type: String, required: true },
    correct: { type: Boolean, required: true },
  },
  { _id: false },
);

// Ein Satzteil einer matching-Aufgabe: part1 links, part2 rechts.
const TwoPartSentencesSchema: Schema = new Schema(
  {
    part1: { type: String, required: true },
    part2: { type: String, required: true },
  },
  { _id: false },
);

// Ein Wortreihen-Satz: nur der Satz selbst wird gespeichert, das Mischen
// der Woerter und die Antwort des Benutzers bleiben im Browser.
const WordOrderSentenceSchema: Schema = new Schema(
  {
    sentence: { type: String, required: true },
  },
  { _id: false },
);

const QuizSchema: Schema = new Schema({
  website: { type: String, required: true, index: true },
  book: { type: Types.ObjectId, ref: "Book", required: false },
  subject: { type: String, required: true, index: true },
  name: { type: String, required: false },
  // Wer das Quiz angelegt hat.
  user: { type: Types.ObjectId, ref: "User", required: false, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
QuizSchema.index({ website: 1, subject: 1 });

const BookStoreSchema: Schema = new Schema({
  name: { type: String, required: true },
  subject: { type: String, required: true, index: true },
  website: { type: String, required: false, index: true },
  // Wer den Laden angelegt hat. Nur dieser Benutzer darf ihn aendern.
  user: { type: Types.ObjectId, ref: "User", required: false, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Schulen/Hochschulen/Klassen, aus denen die Aufgaben ihre Schule auswaehlen.
const SchoolSchema: Schema = new Schema({
  name: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const BookSchema: Schema = new Schema({
  name: { type: String, required: true },
  subject: { type: String, required: true, index: true },
  paragraphs: { type: [String], required: false },
  quizzes: { type: [Types.ObjectId], ref: "Quiz", required: false },
  store: { type: Types.ObjectId, ref: "BookStore", required: false, index: true },
  // Wer das Buch angelegt hat. Nur dieser Benutzer darf es aendern oder loeschen.
  user: { type: Types.ObjectId, ref: "User", required: false, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const TopicSchema : Schema = new Schema({
  subject: {type: String, required: true, index: true},
  title: { type: String, required: true },
  tutorial: { type: String, required: false },
  // Das Quiz, in dem das Thema angelegt wurde.
  quiz: { type: Types.ObjectId, ref: "Quiz", required: false, index: true },
  // Uebergeordnetes Thema (fuer Unterthemen). Fehlt = Wurzelthema.
  parentId: { type: Types.ObjectId, ref: "Topic", required: false, index: true },
  // Wer das Topic angelegt hat. Nur dieser Benutzer darf es aendern oder loeschen.
  user: { type: Types.ObjectId, ref: "User", required: false, index: true }
});

const ExerciseSchema: Schema = new Schema({
  quiz: { type: Types.ObjectId, ref: "Quiz", required: true, index: true },
  subject: { type: String, required: false, index: true },
  type: { type: String, required: true, enum: ["gapText", "multipleChoice", "matching", "wordOrder"] },
  imageUrl: { type: String, required: true },
  // Ein Absatz kann auch ohne Topic gespeichert werden (z.B. die Aufgabe eines
  // Buch-Quizzes), deshalb ist das Feld nicht mehr verpflichtend.
  topic: { type: Types.ObjectId, required: false },
  // Schule/Hochschule/Klasse der Aufgabe (siehe School-Dokument).
  school: { type: Types.ObjectId, ref: "School", required: false },
  // Wer die Aufgabe angelegt hat. Nur dieser Benutzer darf sie aendern oder loeschen.
  user: { type: Types.ObjectId, ref: "User", required: false, index: true },
  questionOrInstruction: { type: String, required: false },
  gapText: { type: String, required: false },
  questionEn: { type: String, required: false },
  questionFr: { type: String, required: false },
  options: { type: [ExerciseOptionSchema], required: false },
  optionsEn: { type: [ExerciseOptionSchema], required: false },
  optionsFr: { type: [ExerciseOptionSchema], required: false },
  // matching: die Saelze der Aufgabe und das, was der Benutzer zusammengeklickt hat.
  sentences: { type: [TwoPartSentencesSchema], required: false },
  guessedSentences: { type: [TwoPartSentencesSchema], required: false },
  // word order: der Satz, den der Benutzer rekonstruieren muss.
  wordorder: { type: WordOrderSentenceSchema, required: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});


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
const Topic: Model<ITopic> = connection.model<ITopic>("Topic", TopicSchema );
const Exercise: Model<IExercise> = connection.model<IExercise>("Exercise", ExerciseSchema);
const User: Model<IUser> = connection.model<IUser>("User", UserSchema);
const Dict: Model<IDict> = connection.model<IDict>("Dict", DictSchema);
const DictPref : Model<IDictPref> = connection.model<IDictPref>("DictPref", DictPrefSchema );
const Quiz: Model<IQuiz> = connection.model<IQuiz>("Quiz", QuizSchema);
const Book: Model<IBook> = connection.model<IBook>("Book", BookSchema);
const BookStore: Model<IBookStore> = connection.model<IBookStore>(
  "BookStore",
  BookStoreSchema
);
const School: Model<ISchool> = connection.model<ISchool>(
  "School",
  SchoolSchema
);
const UploadedImage: Model<IUploadedImage> = connection.model<IUploadedImage>(
  "UploadedImage",
  UploadedImageSchema
);


export { Exercise, User, Topic, Dict, DictPref, Quiz, Book, BookStore, School, UploadedImage };
