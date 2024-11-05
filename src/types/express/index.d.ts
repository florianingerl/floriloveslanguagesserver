import express from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id?: string;
        [key: string]: any; // Allows additional properties
      };
    }
  }
}