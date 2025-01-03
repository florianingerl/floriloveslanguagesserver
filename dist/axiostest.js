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
        const data = { "name": "Viktor", "email": "viktor@gmail.com", "password": "ABC" };
        const response = yield client.post(`/api/user`, data, config);
        console.log(response.status);
        console.log(response.data.json);
    }
    catch (err) {
        console.log(err);
    }
}))();
