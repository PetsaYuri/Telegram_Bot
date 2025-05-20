export interface ICreateTestSession {
    cursor: number,
    state: {
        title?: string,
        typeOfTest?: string,
        documentId?: string,
        isForcedExit: boolean
    }
}