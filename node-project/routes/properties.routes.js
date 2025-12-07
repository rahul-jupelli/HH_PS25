// routes/properties.routes.js
import { Router } from 'express';
import {
  getAllProperties,
  searchProperties,
  getPropertyDetails,
  getSearchPropertyDetails,
  updateProfile
} from '../controllers/properties.controller.js';

const router = Router();

// GET /api -> all properties
router.get('/', getAllProperties);

// GET /api/search?destination=Goa&guests=2
router.get('/search', searchProperties);

// GET /api/details/:destination
router.get('/details/:destination', getPropertyDetails);

router.get('/search/details/:destination', getSearchPropertyDetails);

router.get('/pdateProfile', updateProfile);

export default router;
