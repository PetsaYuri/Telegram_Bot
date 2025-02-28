import express from 'express';
import { authController } from '../controllers/authController';

const router: express.Router = express.Router();

router.get('/auth', authController.auth);
router.get('/oauth2-callback', authController.oauth2Callback);

export default router;