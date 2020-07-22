export interface UserCache {
    username: string;
    password: string;
    role: string[];
}

export interface ResponseToken {
    code: number;
    token: string;
    description: string;
    user: UserCache;
}