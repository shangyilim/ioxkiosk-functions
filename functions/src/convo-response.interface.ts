export interface ConvoResponse {
    intent?: string;
    speech: string;
    caption: string;
    displayMultiLine?: string[];
    payload?: any;
}
