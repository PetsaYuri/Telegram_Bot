import { google } from 'googleapis';
import User from '../models/users';
import { bot } from '../..';
import { ENV } from '../../config/zod/env';

export const OAUTH2_CLIENT = new google.auth.OAuth2(ENV.CLIENT_ID, ENV.CLIENT_SECRET, 'http://localhost:3000/oauth2-callback');

export const authService = {

    auth: async (chatId: any): Promise<string> => {
        return OAUTH2_CLIENT.generateAuthUrl({
            access_type: "offline",
            prompt: 'consent',          //adds a request to the refresh token each time
            scope: [
                "https://www.googleapis.com/auth/classroom.courses",
                "https://www.googleapis.com/auth/classroom.coursework.me",
                "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly",
                'https://www.googleapis.com/auth/classroom.announcements',
                'https://www.googleapis.com/auth/classroom.announcements.readonly',
            ],
            state: chatId,
            redirect_uri: 'http://localhost:3000/oauth2-callback'
        });
    },

    oauth2Callback: async (code: any, state: any): Promise<string> => {
        const { tokens } = await OAUTH2_CLIENT.getToken(code);
        const chatId = state;
        const refreshToken = tokens.refresh_token;
        const user = await User.exists({ chatId });

        if (!user) {
            await User.create({ chatId, refreshToken });
        } else {
            await User.findByIdAndUpdate(user._id, { refreshToken });
        }

        await bot.telegram.sendMessage(chatId, 'Success authorisation', {
            reply_markup: {
                keyboard: [
                    [{ text: 'Get all courses' }]
                ]
            }
        });

        return `tg://resolve?domain=${ENV.BOT_USERNAME}`;
    }
}