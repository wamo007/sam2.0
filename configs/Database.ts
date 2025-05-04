import { Message, User } from '@/configs/dbTypes';
import { type SQLiteDatabase } from 'expo-sqlite';

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  
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
          isDraft INTEGER DEFAULT 0,
          toRemember INTEGER DEFAULT 0
      );

      CREATE TABLE user (
          name TEXT NOT NULL,
          accent TEXT NOT NULL,
          char TEXT NOT NULL,
          charAccent TEXT NOT NULL
      );
  `);

    currentDbVersion = 1;
  }
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
  { role, content, isDraft, toRemember }: Message
) => {
  return await db.runAsync(
    'INSERT INTO messages (role, content, isDraft, toRemember) VALUES (?, ?, ?, ?)',
    role,
    content,
    // timestamp,
    isDraft ? 1 : 0,
    toRemember ? 1 : 0
  );
};

export const removeMemories = async (
  db: SQLiteDatabase,
  // { role, content, isDraft, toRemember }: Message
) => {
  try {
    await db.runAsync(
      'UPDATE messages SET toRemember = 0 WHERE toRemember = 1'
    );
    return true;
  } catch (error) {
    console.error('Error removing memories:', error);
    return false;
  }
};

export const changeUser = async (
  db: SQLiteDatabase,
  { name, accent, char, charAccent }: User
) => {
  await db.runAsync('DELETE FROM user');
  return await db.runAsync(
    'INSERT INTO user (name, accent, char, charAccent) VALUES (?, ?, ?, ?)',
    name,
    accent,
    char,
    charAccent
  );
};

export const getUser = async (db: SQLiteDatabase): Promise<User[]> => {
  return (await db.getAllAsync<User>('SELECT * FROM user')).map(
    (user) => ({
      name: user.name,
      accent: user.accent,
      char: user.char,
      charAccent: user.charAccent
    })
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
