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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDict = exports.getDictById = exports.getAllDicts = exports.createDict = exports.updateDictPref = exports.getDictPrefByEmailAndLg = exports.createDictPref = void 0;
const LanguageLearningModel_1 = require("../../models/LanguageLearningModel");
const createDictPref = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dictPref = yield LanguageLearningModel_1.DictPref.create(Object.assign({}, req.body));
        res.status(201).json(dictPref);
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ message: error.message });
        }
        else {
            res.status(400).json({ message: "An unknown error occurred" });
        }
    }
});
exports.createDictPref = createDictPref;
const getDictPrefByEmailAndLg = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dictPref = yield LanguageLearningModel_1.Dict.find(req.params);
        if (!dictPref) {
            res.status(404).json({ message: "Dictionary preference not found" });
            return;
        }
        res.json(dictPref);
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ message: error.message });
        }
        else {
            res.status(400).json({ message: "An unknown error occurred" });
        }
    }
});
exports.getDictPrefByEmailAndLg = getDictPrefByEmailAndLg;
const updateDictPref = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dictPref = yield LanguageLearningModel_1.DictPref.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!dictPref) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json(dictPref);
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ message: error.message });
        }
        else {
            res.status(400).json({ message: "An unknown error occurred" });
        }
    }
});
exports.updateDictPref = updateDictPref;
// controllers/userController.js
const createDict = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dict = yield LanguageLearningModel_1.Dict.create(Object.assign({}, req.body));
        res.status(201).json(dict);
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ message: error.message });
        }
        else {
            res.status(400).json({ message: "An unknown error occurred" });
        }
    }
});
exports.createDict = createDict;
const getAllDicts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dicts = yield LanguageLearningModel_1.Dict.find();
        res.json(dicts);
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ message: error.message });
        }
        else {
            res.status(400).json({ message: "An unknown error occurred" });
        }
    }
});
exports.getAllDicts = getAllDicts;
const getDictById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dict = yield LanguageLearningModel_1.Dict.findById(req.params.id);
        if (!dict) {
            res.status(404).json({ message: "Dictionary not found" });
            return;
        }
        res.json(dict);
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ message: error.message });
        }
        else {
            res.status(400).json({ message: "An unknown error occurred" });
        }
    }
});
exports.getDictById = getDictById;
const deleteDict = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dict = yield LanguageLearningModel_1.Dict.findByIdAndDelete(req.params.id);
        if (!dict) {
            res.status(404).json({ message: "Dictionary not found" });
            return;
        }
        res.json({ message: "Dictionary deleted" });
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ message: error.message });
        }
        else {
            res.status(400).json({ message: "An unknown error occurred" });
        }
    }
});
exports.deleteDict = deleteDict;
