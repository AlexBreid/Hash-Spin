"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ipfs = void 0;
const typedi_1 = require("typedi");
const tatum_connector_1 = require("../../connector/tatum.connector");
const util_1 = require("../../util");
let Ipfs = class Ipfs {
    constructor(id) {
        this.id = id;
        this.config = typedi_1.Container.of(this.id).get(util_1.CONFIG);
        this.connector = typedi_1.Container.of(this.id).get(tatum_connector_1.TatumConnector);
    }
    /**
     * Upload file to the IPFS storage.
     * @param body Body of the request with file to be uploaded.
     * @returns ResponseDto<{txId: string}> IPFS hash id of the uploaded file.
     */
    async uploadFile(body) {
        return util_1.ErrorUtils.tryFail(() => this.connector.uploadFile({
            path: `ipfs`,
            body: body.file,
        }));
    }
    /**
     * Get file binary data from the IPFS storage.
     * @param body Body of the request with file to be uploaded.
     * @returns Blob IPFS file binary data.
     * @returns ResponseDto<null> is error occurred.
     */
    async getFile(body) {
        return util_1.ErrorUtils.tryFailBlob(() => this.connector.getFile({
            path: `ipfs/${body.id}`,
        }));
    }
};
exports.Ipfs = Ipfs;
exports.Ipfs = Ipfs = __decorate([
    (0, typedi_1.Service)({
        factory: (data) => {
            return new Ipfs(data.id);
        },
        transient: true,
    }),
    __metadata("design:paramtypes", [String])
], Ipfs);
//# sourceMappingURL=ipfs.js.map