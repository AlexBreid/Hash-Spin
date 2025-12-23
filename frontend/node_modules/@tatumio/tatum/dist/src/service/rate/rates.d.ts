import { ResponseDto } from '../../util';
import { Rate, RateBatchDto } from './rates.dto';
export declare class Rates {
    private readonly id;
    private connector;
    constructor(id: string);
    getCurrentRate(currency: string, basePair: string): Promise<ResponseDto<Rate>>;
    getCurrentRateBatch(pairs: RateBatchDto[]): Promise<ResponseDto<Rate[]>>;
}
