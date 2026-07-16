export default {
    port: process.env.PORT || 3000,
    fastapiUrl: process.env.FASTAPI_URL || 'http://localhost:8000',
    db: {
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USERNAME,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE
    },
    jwt: {
        accessSecret: process.env.ACCESS_TOKEN_SECRET,
        refreshSecret: process.env.REFRESH_TOKEN_SECRET,
        accessExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '1h',
        refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'
    },
    clientOrigin: process.env.CLIENT_ORIGIN,
    nodeEnv: process.env.NODE_ENV || 'development'
};