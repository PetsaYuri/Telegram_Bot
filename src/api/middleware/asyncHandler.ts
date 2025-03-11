import { Context } from "telegraf";

export const asyncHandler = (fn: Function) => async (ctx: Context, next: () => Promise<void>) => {
    await fn(ctx, next)
}