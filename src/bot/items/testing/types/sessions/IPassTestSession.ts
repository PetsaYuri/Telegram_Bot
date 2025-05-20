import { Scenes } from "telegraf"

export interface IPassTestSession extends Scenes.WizardSessionData {
    state: {
        answers: Map<string, string>,
        isForcedExit: boolean
    }
}   