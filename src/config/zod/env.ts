import zod from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = zod.object({
    BOT_TOKEN: zod.string().refine(
        token => token.length === 46, 'Invalid bot token'
    ),

    MONGODB_URI: zod.string().refine(
        uri => uri.startsWith('mongodb+srv://'), 'Invalid mongo db URI'
    ),

    HOST_URI: zod.string().refine(
        uri => uri.startsWith('http://') || uri.startsWith('https://'), 'Invalid host URI'
    ),

    PORT: zod.string().default('3000').refine(
        (port) => parseInt(port) > 0 && parseInt(port) < 65536,
        'Invalid port number'
    ),

    CLIENT_ID: zod.string().refine(
        id => (id.length === 73 || id.length === 72) && id.endsWith('.apps.googleusercontent.com'),
        'Invalid client id'
    ),

    CLIENT_SECRET: zod.string().refine(
        secret => secret.length === 35,
        'Invalid client secret'
    ),

    BOT_USERNAME: zod.string().refine(
        name => name.endsWith('Bot') || name.endsWith('bot'),
        'Invalid bot username'
    ),

    DATA_RETENTION_PERIOD: zod.string().refine(
        period => period.match(/^\d{1,2}d$/),
        'Invalid data retention duration'
    ),

    USER_CLEANUP_CRON: zod.string().refine(
        time => time.match(/^\d{1,2}[mhd]$/),
        'Invalid user cleanup cron value'
    ),

    SECRET_KEY_FOR_USER_INFO: zod.string().refine(
        key => key.length === 64
    ),

    GOOGLE_GEMINI_API_KEY: zod.string().refine(
        key => key.length === 39 && key.startsWith('AIzaSy'),
        'Invalid Google Gemini API key'
    ),

    LANGUAGE: zod.string().refine(
        key => key.length > 1,
        "An invalid language (the 'lang' key) has been defined in the '.env' file"
    )
});

type Env = zod.infer<typeof envSchema>;
export const ENV: Env = envSchema.parse(process.env);
