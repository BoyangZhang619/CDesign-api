import crypto from 'crypto';

function sha256(text: crypto.BinaryLike) {
    return crypto.createHash('sha256').update(text).digest("hex");
}

export {
    sha256
}