import { Request, Response } from "express";
import { authService } from "../services/authService";

export const authController = {
    auth: async (req: Request, res: Response): Promise<void> => {
        const chatId = req.query.chat_id;
        const authUri = await authService.auth(chatId);
        res.redirect(authUri);
    },

    oauth2Callback: async (req: Request, res: Response): Promise<void> => {
        const { code, state } = req.query;
        const backUri = await authService.oauth2Callback(code, state)
        res.redirect(backUri);
    }
}