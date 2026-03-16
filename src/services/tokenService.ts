import jwt from 'jsonwebtoken';
import env from '../config/env.js';

const jwtConfig = env.jwt;

function signAccessToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.id
        },
        jwtConfig.accessSecret,
        {
            expiresIn: jwtConfig.accessExpiresIn,
        }
    );
}

function signRefreshToken(user) {
    return jwt.sign(
        {
            id: user.id,
        },
        jwtConfig.refreshSecret,
        {
            expiresIn: jwtConfig.refreshExpiresIn,
        }
    );
}

function verifyAccessToken(token) {
    return jwt.verify(token,jwtConfig.accessSecret);
}

function verifyRefreshToken(token) {
    return jwt.verify(token,jwtConfig.refreshSecret);
}

export {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken
}