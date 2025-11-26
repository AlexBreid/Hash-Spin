export declare enum Status {
    SUCCESS = "SUCCESS",
    ERROR = "ERROR"
}
export interface ResponseDto<T> {
    /**
     * Actual payload of the response
     */
    data: T;
    /**
     * Status of the response
     */
    status: Status;
    /**
     * In case of ERROR status, this field contains the error message and detailed description
     */
    error?: ErrorWithMessage;
}
type ErrorWithMessage = {
    message: string[] | object[];
    code?: string;
    dashboardLog?: string;
};
export declare const ErrorUtils: {
    tryFailTron: <T>(f: (() => Promise<T>) | (() => T)) => Promise<ResponseDto<T>>;
    tryFail: <T_1>(f: (() => Promise<T_1>) | (() => T_1)) => Promise<ResponseDto<T_1>>;
    tryFailBlob: (f: (() => Promise<Blob>) | (() => Blob)) => Promise<Blob | ResponseDto<null>>;
    formatErrorMsg: (message: string) => string;
    toErrorWithMessage: (maybeError: unknown) => ErrorWithMessage;
    isErrorWithMessage(e: unknown): e is ErrorWithMessage;
    toErrorResponse<T_2>(error: ErrorWithMessage): ResponseDto<T_2>;
};
export {};
