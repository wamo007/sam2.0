import { Message, Role } from '@/configs/dbTypes';
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
            timestamp INTEGER NOT NULL,
            content TEXT NOT NULL,
            isDraft INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE memories (
            id INTEGER PRIMARY KEY NOT NULL,
            content TEXT NOT NULL,
            embedding TEXT NOT NULL,
            importance REAL NOT NULL DEFAULT 0.5,
            timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );

        CREATE INDEX idx_memories_timestamp ON memories(timestamp);
    `);

    currentDbVersion = 1;
  }
  // if (currentDbVersion === 1) {
  //   Add more migrations
  // }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

export const getMessages = async (db: SQLiteDatabase): Promise<Message[]> => {
  return (await db.getAllAsync<Message>('SELECT * FROM messages')).map(
    (message) => ({
      ...message,
      role: '' + message.role === 'assistant' ? Role.Assistant : Role.User,
    })
  );
};

export const addMessage = async (
  db: SQLiteDatabase,
  { role, content, timestamp, isDraft }: Message
) => {
  return await db.runAsync(
    'INSERT INTO messages (role, content, timestamp, isDraft) VALUES (?, ?, ?, ?)',
    role === Role.Assistant ? 'assistant' : 'user',
    content,
    timestamp,
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
