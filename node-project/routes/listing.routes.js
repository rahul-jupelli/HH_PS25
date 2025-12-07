// routes/listing.routes.js
import express from "express";
import multer from "multer";
import { createCasualListing, createProfessionalListing } from "../controllers/listing.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// Multer memory storage (needed for Supabase uploads)
const upload = multer({ storage: multer.memoryStorage() });

// CASUAL LISTING (requires login)
router.post(
    "/casual",
    authenticateToken,
    upload.array("photos", 10),
    createCasualListing
);

// PROFESSIONAL LISTING (requires login)
router.post(
    "/professional",
    authenticateToken,
    upload.array("photos", 10),
    createProfessionalListing
);

export default router;
