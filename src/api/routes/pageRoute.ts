import express from 'express'
import { pageController } from '../controllers/pageController';

const router = express.Router();

router.get('/', pageController.homePage);
router.get('/privacy-policy', pageController.privacyPolicy);
router.get('/terms-of-service', pageController.termsOfService);

export default router;