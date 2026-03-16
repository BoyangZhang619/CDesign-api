export const securityConfig = {
    apiKey: process.env.API_KEY || 'replace-this-in-production',

    allowedOrigins: [
        'https://your-frontend.com',
        'https://admin.your-frontend.com',
        'http://localhost:5173',
    ],

    rateLimit: {
        windowMs: 60 * 1000, // 1 分钟
        max: 60, // 每个 IP 在窗口内最多请求次数
    },

    allowNoOriginWithApiKey: true, //允许curl/Postman这类不带Origin的请求，只要带API Key就行了
};