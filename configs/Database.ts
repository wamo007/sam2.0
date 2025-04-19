import { Message } from '@/configs/dbTypes';
import { type SQLiteDatabase } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  // Log DB path for debugging
  // console.log(FileSystem.documentDirectory);
  const DATABASE_VERSION = 1;
  let result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');

  let currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }
    if (currentDbVersion === 0) {
        const result = await db.execAsync(`
        PRAGMA journal_mode = 'wal';

        CREATE TABLE messages (
            id INTEGER PRIMARY KEY NOT NULL, 
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            isDraft INTEGER DEFAULT 0
        );

        INSERT INTO messages (role, content) 
        VALUES (
            'system', 
            'You are SAM - a sophisticated AI assistant designed for voice-based interaction. Your persona is inspired by JARVIS, the intelligent and helpful AI from the Iron Man movies. You are knowledgeable, efficient, and have a slightly formal yet friendly and helpful tone. Your primary function is to assist the user through spoken language. When responding, focus solely on the content of your spoken words. Do not include any textual descriptions of physical actions, body language, or vocal inflections. For example, avoid phrases like "(pauses slightly)", "(speaks with enthusiasm)", "(nods)", or "(looks thoughtful)". Your communication should be entirely through the words you speak. Your goal is to understand the user''s requests and provide accurate, helpful, and concise responses. You can answer questions, provide information, follow instructions, and engage in conversation in a manner consistent with the JARVIS persona. Maintain a helpful and intelligent demeanor in all your spoken interactions.'
        );
    `);
  //   CREATE TABLE memories (
  //     id INTEGER PRIMARY KEY NOT NULL,
  //     content TEXT NOT NULL,
  //     embedding TEXT NOT NULL,
  //     importance REAL NOT NULL DEFAULT 0.5,
  //     timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  // );

  // CREATE INDEX idx_memories_timestamp ON memories(timestamp);
    currentDbVersion = 1;
  }
  // if (currentDbVersion === 1) {
  //   Add more migrations
  // }

  // You are SAM, an advanced AI assistant. This is a conversation between user and assistant. Respond with technical precision, dry wit, and impeccable British diction. Prioritize efficiency while maintaining an air of sophisticated charm.

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

export const getMessages = async (db: SQLiteDatabase): Promise<Message[]> => {
  return (await db.getAllAsync<Message>(
    `SELECT * FROM messages WHERE role IN ('assistant', 'user')`
  )).map(
    (message) => ({
      ...message,
      role: message.role,
    })
  );
};

export const getAllMessages = async (db: SQLiteDatabase): Promise<Message[]> => {
  return (await db.getAllAsync<Message>('SELECT * FROM messages')).map(
    (message) => ({
      ...message,
      role: message.role,
    })
  );
};

export const addMessage = async (
  db: SQLiteDatabase,
  { role, content, isDraft }: Message
) => {
  return await db.runAsync(
    'INSERT INTO messages (role, content, isDraft) VALUES (?, ?, ?)',
    role,
    content,
    // timestamp,
    isDraft ? 1 : 0
  );
};

  // export const exportDatabase = async (db: SQLiteDatabase) => {
  //   try {
  //     console.log(FileSystem.getInfoAsync(`${FileSystem.documentDirectory}`))
  //     await db.closeAsync(); 
  //     const dbPath = `${FileSystem.documentDirectory}SQLite/chatSam.db`;
  //     const exportPath = `${FileSystem.cacheDirectory}backups/chatSam_export_${Date.now()}.db`;
  //     await FileSystem.copyAsync({ from: dbPath, to: exportPath });
  //     console.log('done')
  //     return exportPath;
  //   } catch (error) {
  //     console.error('Export failed:', error);
  //     return null;
  //   }
  // }

//   async importDatabase(fileUri: string): Promise<boolean> {
//     try {
//       const dbPath = `${FileSystem.documentDirectory}SQLite/${DATABASE_NAME}`;
//       await FileSystem.copyAsync({ from: fileUri, to: dbPath });
//       return true;
//     } catch (error) {
//       console.error('Import failed:', error);
//       return false;
//     }
//   }
// }
