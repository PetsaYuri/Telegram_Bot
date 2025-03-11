import { Telegraf } from 'telegraf';
import mongoose from 'mongoose';
import express from 'express';
import authRoute from './api/routes/authRoute';
import pageRoute from './api/routes/pageRoute';
import { botController } from './bot/botController';
import dotenv from 'dotenv';
import { ENV } from './config/zod/env';
import path from 'path';
import { errorHandler } from './api/middleware/errorHandler';
import { manageInactiveUsersScheduler } from './api/services/userService';

dotenv.config();
mongoose.connect(ENV.MONGODB_URI);
const app = express();

const BOT_TOKEN = ENV.BOT_TOKEN;
export const bot = new Telegraf(BOT_TOKEN);
botController(bot);
bot.launch();
bot.catch(errorHandler)

app.listen(ENV.PORT, () => {
    console.log(`Server is running on port: ${ENV.PORT}`)
})

//schedulers
manageInactiveUsersScheduler();

app.use(express.static(path.join(__dirname, 'public')))
app.use(pageRoute);
app.use(authRoute);
