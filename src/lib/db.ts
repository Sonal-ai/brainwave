import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src', 'data', 'db.json');
const DATA_DIR = path.join(process.cwd(), 'src', 'data');

export interface User {
    id: string;
    username: string;
    password: string; // Storing plain text for demo purposes as requested
    name: string;
    subjects: string[];
    timetable?: { subjects: any[] };
    files: FileRecord[];
}

export interface FileRecord {
    id: string;
    name: string;
    size: number;
    type: string;
    subject: string;
    uploadDate: string;
    mediaId?: string; // OnDemand Media ID
    parsed?: boolean; // If analysis is complete
}

export interface DB {
    users: User[];
}

// Initial seed data
const SEED_DATA: DB = {
    users: [
        {
            id: 'user_1',
            username: 'user 1',
            password: '12345',
            name: 'Test Student',
            subjects: [],
            files: []
        }
    ]
};

function ensureDb() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify(SEED_DATA, null, 2));
    }
}

export function getDb(): DB {
    ensureDb();
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    try {
        return JSON.parse(data);
    } catch (e) {
        return SEED_DATA;
    }
}

export function saveDb(db: DB) {
    ensureDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export async function findUser(username: string) {
    const db = getDb();
    return db.users.find(u => u.username === username);
}

export async function createUser(user: User) {
    const db = getDb();
    db.users.push(user);
    saveDb(db);
    return user;
}
