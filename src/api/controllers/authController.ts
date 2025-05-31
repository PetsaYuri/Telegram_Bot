import { Request, Response } from "express";
import { authService } from "../services/authService";
import { ENV } from "../../config/zod/env";

export const authController = {
    auth: async (req: Request, res: Response): Promise<void> => {
        const chatId = req.query.chat_id;
        const lang = req.query.lang ?? ENV.LANGUAGE;
        const authUri = await authService.auth(chatId, lang);
        res.redirect(authUri);
    },

    oauth2Callback: async (req: Request, res: Response): Promise<void> => {
        const { code, state } = req.query;
        const backUri = await authService.oauth2Callback(code, state)
        res.redirect(backUri);
    }
}