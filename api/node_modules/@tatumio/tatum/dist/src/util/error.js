"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorUtils = exports.Status = void 0;
var Status;
(function (Status) {
    Status["SUCCESS"] = "SUCCESS";
    Status["ERROR"] = "ERROR";
})(Status || (exports.Status = Status = {}));
exports.ErrorUtils = {
    tryFailTron: async (f) => {
        const response = await exports.ErrorUtils.tryFail(f);
        const error = 'Error';
        if (response.data[error]) {
            return {
                data: null,
                status: Status.ERROR,
                error: exports.ErrorUtils.toErrorWithMessage(response.data[error]),
            };
        }
        return response;
    },
    tryFail: async (f) => {
        try {
            const data = await f();
            return {
                data,
                status: Status.SUCCESS,
            };
        }
        catch (e) {
            return {
                data: null,
                status: Status.ERROR,
                error: exports.ErrorUtils.toErrorWithMessage(e),
            };
        }
    },
    tryFailBlob: async (f) => {
        try {
            return await f();
        }
        catch (e) {
            return {
                data: null,
                status: Status.ERROR,
                error: exports.ErrorUtils.toErrorWithMessage(e),
            };
        }
    },
    formatErrorMsg: (message) => {
        return message.replace('attr.', '');
    },
    toErrorWithMessage: (maybeError) => {
        if (typeof maybeError === 'string') {
            try {
                const error = JSON.parse(maybeError);
                if (error.data instanceof Array && error.data.length > 0) {
                    return {
                        message: error.data.map((message) => exports.ErrorUtils.formatErrorMsg(message)),
                        code: error.errorCode,
                        dashboardLog: error.dashboardLog,
                    };
                }
                return {
                    message: [error.message ?? maybeError],
                    code: error.errorCode,
                    dashboardLog: error.dashboardLog,
                };
                // eslint-disable-next-line no-empty
            }
            catch (_) { }
        }
        if (exports.ErrorUtils.isErrorWithMessage(maybeError)) {
            return { message: [maybeError.message], dashboardLog: maybeError.dashboardLog };
        }
        try {
            return {
                message: [JSON.stringify(maybeError, null, 2)],
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                dashboardLog: maybeError.dashboardLog,
            };
        }
        catch {
            // fallback in case there's an error stringifying the maybeError
            // like with circular references for example.
            return { message: [String(maybeError)] };
        }
    },
    isErrorWithMessage(e) {
        return (typeof e === 'object' &&
            e !== null &&
            'message' in e &&
            typeof e.message === 'string');
    },
    toErrorResponse(error) {
        return {
            data: null,
            status: Status.ERROR,
            error: error,
        };
    },
};
//# sourceMappingURL=error.js.map