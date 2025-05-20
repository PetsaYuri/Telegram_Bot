import { Request, Response } from "express";
import path from 'path'

export const pageController = {
    homePage: (req: Request, res: Response): void => {
        res.sendFile(path.resolve(__dirname, '../../public/html/index.html'));
    },

    privacyPolicy: (req: Request, res: Response): void => {
        res.sendFile(path.resolve(__dirname, '../../public/html/privacy-policy.html'));
    },

    termsOfService: (req: Request, res: Response): void => {
        res.sendFile(path.resolve(__dirname, '../../public/html/terms-of-service.html'));
    },

    indexTrans: (req: Request, res: Response): void => {
        res.sendFile(path.resolve(__dirname, '../../public/html/translations/indexTrans.json'));
    },

    privacyPolicyTrans: (req: Request, res: Response): void => {
        res.sendFile(path.resolve(__dirname, '../../public/html/translations/privacyPolicyTrans.json'));
    },

    termsOfServiceTrans: (req: Request, res: Response): void => {
        res.sendFile(path.resolve(__dirname, '../../public/html/translations/termsOfServiceTrans.json'));
    },
}
