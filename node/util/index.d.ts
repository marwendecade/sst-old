type AllVariables = Record<string, Record<string, Record<string, string>>>;
export declare function createProxy<T extends object>(constructName: string): T;
export declare function getVariables2(constructName: string): Record<string, Record<string, string>>;
export declare function parseEnvironment(): Promise<AllVariables>;
export {};
