import { OAuth2Client } from 'google-auth-library';
import User from '../models/users';
import { bot } from '../..';
import { ENV } from '../../config/zod/env';
import { encryptUserData } from './userService';

export const OAUTH2_CLIENT = new OAuth2Client(ENV.CLIENT_ID, ENV.CLIENT_SECRET, `${ENV.HOST_URI}/oauth2-callback`);

export const authService = {

    auth: async (chatId: any): Promise<string> => {
        return OAUTH2_CLIENT.generateAuthUrl({
            access_type: "offline",
            prompt: 'consent',          //adds a request to the refresh token each time
            scope: [
                "https://www.googleapis.com/auth/classroom.courses",
                "https://www.googleapis.com/auth/classroom.coursework.me",
                "https://www.googleapis.com/auth/classroom.coursework.students",
                "https://www.googleapis.com/auth/classroom.courseworkmaterials",
                'https://www.googleapis.com/auth/classroom.announcements'
            ],
            state: chatId,
            redirect_uri: `${ENV.HOST_URI}/oauth2-callback`
        });
    },

    oauth2Callback: async (code: any, state: any): Promise<string> => {
        const { tokens } = await OAUTH2_CLIENT.getToken(code);
        const chatId = state;
        const refreshToken = tokens.refresh_token as string;
        await setRefreshTokenToUser(chatId, refreshToken);
        await bot.telegram.sendMessage(chatId, 'Success authorisation', {
            reply_markup: {
                keyboard: [
                    [{ text: '/menu' }]
                ]
            }
        });

        return `tg://resolve?domain=${ENV.BOT_USERNAME}`;
    }
}

async function setRefreshTokenToUser(chatId: string, refreshToken: string) {
    const encryptedToken = encryptUserData(refreshToken);
    const user = await User.exists({ chatId });

    if (!user) {
        await User.create({ chatId, refreshToken: encryptedToken });
    } else {
        await User.findByIdAndUpdate(user._id, { refreshToken: encryptedToken });
    }
}
