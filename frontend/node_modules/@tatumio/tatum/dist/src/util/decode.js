"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeHexString = exports.decodeUInt256 = void 0;
function decodeUInt256(hex) {
    const formattedHex = hex.replace(/^0x/, ''); // Remove 0x
    return Number('0x' + formattedHex);
}
exports.decodeUInt256 = decodeUInt256;
function decodeHexString(hex) {
    const formattedHex = hex.replace(/^(0x)?0+/, ''); // Remove 0x and leading zeros
    const byteLength = formattedHex.length / 2;
    const bytes = [];
    for (let i = 0; i < byteLength; i++) {
        const byte = parseInt(formattedHex.substr(i * 2, 2), 16); // Get the current byte
        bytes.push(byte);
    }
    return bytes
        .map((byte) => String.fromCharCode(byte))
        .filter((char) => /[a-zA-Z0-9]/.test(char))
        .join('');
}
exports.decodeHexString = decodeHexString;
//# sourceMappingURL=decode.js.map