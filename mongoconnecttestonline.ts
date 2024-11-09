

/*
mongodb+srv://imelflorianingerl:<db_password>@cluster0.s8sclhk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

Replace <db_password> with the password for the imelflorianingerl database user. Ensure any option params are 
URL encoded */



import { Schema, model, connect } from 'mongoose';

// 1. Create an interface representing a document in MongoDB.
interface IUser {
  name: string;
  email: string;
  avatar?: string;
}

// 2. Create a Schema corresponding to the document interface.
const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  avatar: String
});

// 3. Create a Model.
const User = model<IUser>('User', userSchema);

run().catch(err => console.log(err));

async function run() {
  // 4. Connect to MongoDB
  await connect('mongodb+srv://flori:ABC@cluster0.p9bpe.mongodb.net/');

  const user = new User({
    name: 'Bill',
    email: 'bill@initech.com',
    avatar: 'https://i.imgur.com/dM7Thhn.png'
  });
  await user.save();

  console.log(user.email); // 'bill@initech.com'
}