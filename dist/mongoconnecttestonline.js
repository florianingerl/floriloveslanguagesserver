"use strict";
/*
mongodb+srv://imelflorianingerl:<db_password>@cluster0.s8sclhk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

Replace <db_password> with the password for the imelflorianingerl database user. Ensure any option params are
URL encoded */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// 2. Create a Schema corresponding to the document interface.
const userSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    avatar: String
});
// 3. Create a Model.
const User = (0, mongoose_1.model)('User', userSchema);
run().catch(err => console.log(err));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        // 4. Connect to MongoDB
        yield (0, mongoose_1.connect)('mongodb+srv://flori:ABC@cluster0.p9bpe.mongodb.net/');
        const user = new User({
            name: 'Bill',
            email: 'bill@initech.com',
            avatar: 'https://i.imgur.com/dM7Thhn.png'
        });
        yield user.save();
        console.log(user.email); // 'bill@initech.com'
    });
}
