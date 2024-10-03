import { PowerSyncDatabase } from "@powersync/web";
import { SupabaseConnector } from "@/supabase";
import { schema } from "./schema";

export let PowerSync;
export let Supabase;

const create = () => {
  console.log("Creating PowerSyncDatabase");
  PowerSync = new PowerSyncDatabase({
    schema,
    database: {
      dbFilename: import.meta.env.VITE_SQL_DB_FILENAME,
    },
  });
  console.log("PowerSyncDatabase Created");
};

export const reconnect = async (current_page) => {
  console.log("reconnecting to supabase ...", current_page);
  await PowerSync.disconnect();

  return new Promise((resolve) => {
    const { lastSyncedAt } = PowerSync.currentStatus;

    PowerSync.connect(Supabase, { params: { current_page } });

    const dispose = PowerSync.registerListener({
      statusChanged: (status) => {
        if (status.lastSyncedAt.valueOf() !== lastSyncedAt.valueOf()) {
          console.log("reconnected");
          dispose();
          resolve();
        }
      },
    });
  });
};

export const connect = async () => {
  console.log("connecting to supabase ...");
  await PowerSync.connect(
    (Supabase = new SupabaseConnector({
      powersyncUrl: import.meta.env.VITE_POWERSYNC_URL,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    }))
  );
  console.log("wait for first sync");
  return PowerSync.waitForFirstSync().then(() => {
    console.log("First sync done");
    console.log("connected to supabase");
    console.log("connected to powersync");
  });
};

export const loginAnon = async () => {
  await Supabase.loginAnon();
};

export const openDatabase = async (config) => {
  create();
  await connect();
};

export function watchList(onResult) {
  PowerSync.watch(`SELECT * FROM list ORDER BY created_at`, [], {
    onResult: (result) => {
      onResult(result.rows);
    },
  });
}

export const insertItem = async (text) => {
  return PowerSync.execute(
    "INSERT INTO list(id, text) VALUES(uuid(), ?) RETURNING *",
    [text]
  );
};

export const updateItem = async (id, text) => {
  return PowerSync.execute("UPDATE list SET text = ? WHERE id = ?", [text, id]);
};

export const deleteItem = async (id) => {
  return PowerSync.execute("DELETE FROM list WHERE id = ?", [id]);
};

export const allItems = async () => {
  return await PowerSync.getAll("SELECT * FROM list ORDER BY created_at");
};

export const deleteAllItems = async () => {
  return PowerSync.execute("DELETE FROM list");
};

export const execute = async (sql, params) => {
  return PowerSync.execute(sql, params);
};
