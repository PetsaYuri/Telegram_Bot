import { Scenes } from "telegraf";
import { ICreateTaskSession } from "./CustomSession";

export interface ICreateTaskContext extends Scenes.WizardContext<ICreateTaskSession> { }