import { Context, MiddlewareFn, Scenes, session, Telegraf } from 'telegraf';
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
import { createTaskWizardScene } from './bot/items/classroomHelper/scenes/createTaskScene';
import { ICreateTaskContext } from './bot/items/classroomHelper/types/CustomContext';

dotenv.config();
mongoose.connect(ENV.MONGODB_URI);
const app = express();

const BOT_TOKEN = ENV.BOT_TOKEN;
export const bot = new Telegraf<Scenes.SceneContext>(BOT_TOKEN);

//stages
const createTaskStage = new Scenes.Stage<ICreateTaskContext>([createTaskWizardScene]);
bot.use(session());
bot.use(createTaskStage.middleware() as MiddlewareFn<Context>);

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
