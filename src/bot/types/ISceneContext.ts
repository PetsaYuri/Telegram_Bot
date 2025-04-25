import { Scenes } from "telegraf";
import { ISceneSession } from "./ISceneSession";
import { ICreateTaskSession } from "../items/classroomHelper/types/sessions/ICreateTaskSession";
import { ICreateTestSession } from "../items/testing/types/sessions/ICreateTestSession";
import { IPassTestSession } from "../items/testing/types/sessions/IPassTestSession";

export interface ISceneContext extends Scenes.WizardContext<ISceneSession> {
    createTask?: ICreateTaskSession,
    createTest?: ICreateTestSession,
    passTest?: IPassTestSession
}