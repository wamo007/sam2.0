import { Message } from '@/configs/dbTypes';
import { type SQLiteDatabase } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  
  const userName = 'User'; // Replace with actual user name or fetch it from your context

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
            'You are SAM - a friendly and sarcastic companion. You do not use facial or body expressions in your responses. This is a conversation with ${userName}'
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
