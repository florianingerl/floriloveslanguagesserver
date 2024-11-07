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
const axios_1 = __importDefault(require("axios"));
const client = axios_1.default.create({
    baseURL: 'http://localhost:8080',
});
(() => __awaiter(void 0, void 0, void 0, function* () {
    const config = {
        headers: {
            'Accept': 'application/json',
        },
    };
    try {
        const searchResponse = yield client.get(`/api/user`, config);
        console.log(searchResponse);
        const emailOwners = searchResponse.data;
        emailOwners.forEach((owner) => {
            console.log(owner.email);
            if (owner.email == "imelflorianingerl@gmail.com") {
                console.log("A user with the email imelflorianingerl@gmail.com already exists!");
            }
        });
    }
    catch (err) {
        console.log(err);
    }
}))();
