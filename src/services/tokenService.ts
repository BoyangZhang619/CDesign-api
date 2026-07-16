import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import env from '../config/env.js';

const jwtConfig = env.jwt;

interface TokenUser {
    id: number;
    email: string;
}

function signAccessToken(user: TokenUser): string {
    return jwt.sign(
        { userId: user.id, email: user.email, jti: crypto.randomUUID() },
        jwtConfig.accessSecret!,
        { expiresIn: jwtConfig.accessExpiresIn } as jwt.SignOptions
    );
}

function signRefreshToken(user: TokenUser): string {
    return jwt.sign(
        { userId: user.id, jti: crypto.randomUUID() },
        jwtConfig.refreshSecret!,
        { expiresIn: jwtConfig.refreshExpiresIn } as jwt.SignOptions
    );
}

function verifyAccessToken(token: string): string | JwtPayload {
    return jwt.verify(token, jwtConfig.accessSecret!);
}

function verifyRefreshToken(token: string): string | JwtPayload {
    return jwt.verify(token, jwtConfig.refreshSecret!);
}

export {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    TokenUser,
};
