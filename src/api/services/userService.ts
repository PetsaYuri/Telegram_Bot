import crypto from 'crypto'
import cron from 'node-cron';
import Course from '../models/courses';
import User from '../models/users';
import { ENV } from '../../config/zod/env';
import { gaxios } from 'google-auth-library';
import { classroomService } from '../../bot/items/classroomHelper/classroomService';

export function encryptUserData(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENV.SECRET_KEY_FOR_USER_INFO, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted
}

export function decryptUserData(encryptedText: string): string {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedData = textParts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENV.SECRET_KEY_FOR_USER_INFO, 'hex'), iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

export function manageInactiveUsersScheduler() {
    const cronFormattedDate = getCronFormattedTime(ENV.USER_CLEANUP_CRON);
    cron.schedule(cronFormattedDate, async () => {
        console.log('runned a user usage scheduler, data:', new Date());
        const usersWithInvalidToken = await User.find({ isTokenValid: false });
        usersWithInvalidToken.map(async user => await removeUserIfTokenStale(user.id));

        const users = await User.find({ isTokenValid: 'true' });
        users.map(async user => await checkIfUserTokenValid(user.id))
    })
}

function getCronFormattedTime(text: string): string {

    if (text.match(/^\d{1,2}[mhd]$/)) {
        const definedTime = getDefinedTime(text);
        const splitedData = text.split(definedTime);

        const num = splitedData[0]
        switch (definedTime) {
            case 'm':
                return `*/${num} * * * *`
            case 'h':
                return `* */${num} * * *`
            case 'd':
                return `* * */${num} * *`
        }
    }

    throw new Error("the text doesn't match the required regex")
}

function getDefinedTime(text: string): 'm' | 'h' | 'd' {
    if (text.includes('m')) return 'm';
    else if (text.includes('h')) return 'h';
    else if (text.includes('d')) return 'd';

    throw new Error('the text include invalid time')
}

async function checkIfUserTokenValid(userId: string) {
    const isTokenValid = await isUserTokenValid(userId);
    if (!isTokenValid) {
        await User.findByIdAndUpdate(userId, { isTokenValid: false, discoveredInvalidToken: new Date() })
    }
}

async function isUserTokenValid(userId: string): Promise<boolean> {
    try {
        const user = await User.findById(userId);

        if (!user) {
            throw new Error('User is null');
        }

        if (user.isTokenValid) {
            await classroomService.getAllAvailableCourses(user.chatId);
            return true;
        }

        return false;

    } catch (error: any) {

        if (error instanceof gaxios.GaxiosError && error.message === 'invalid_grant') {
            return false;
        }

        console.log('error =', error)
        throw new Error('unkown error')
    }
}

async function removeUserIfTokenStale(userId: string): Promise<void> {
    const user = await User.findById(userId);

    if (user && !user.isTokenValid) {
        const dataRetentionPeriod = ENV.DATA_RETENTION_PERIOD;
        const retentionPeriod = parseInt(dataRetentionPeriod.split('d')[0]);
        const daysBetweenDates = getDaysBetweenDates(new Date(), user.discoveredInvalidToken);

        if (daysBetweenDates >= retentionPeriod) {
            const userCourses = await Course.find({ user });
            userCourses.map(async course => await Course.findByIdAndDelete(course.id));
            await User.findByIdAndDelete(userId);
        }
    }

}

function getDaysBetweenDates(currentDate: Date, prevDate: Date) {
    const diffInMs = currentDate.getTime() - prevDate.getTime();
    return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
}