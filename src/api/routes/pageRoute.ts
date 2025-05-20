import express from 'express'
import { pageController } from '../controllers/pageController';

const router = express.Router();

router.get('/', pageController.homePage);
router.get('/privacy-policy', pageController.privacyPolicy);
router.get('/terms-of-service', pageController.termsOfService);
router.get('/translations/indexTrans.json', pageController.indexTrans);
router.get('/translations/privacyPolicyTrans.json', pageController.privacyPolicyTrans);
router.get('/translations/termsOfServiceTrans.json', pageController.termsOfServiceTrans);

export default router;