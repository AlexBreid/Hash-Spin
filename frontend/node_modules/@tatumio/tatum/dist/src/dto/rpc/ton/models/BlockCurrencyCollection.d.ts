export type BlockCurrencyCollection = {
    grams: number;
    other: Array<{
        id: number;
        value: string;
    }>;
};
