// Sync limited data and then load more data from an API
import { Supabase, PowerSync, execute } from "../powersync";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function makeTriggerSyncSource(bufferSize) {
  let buffer = [];
  async function sync(start, end) {
    console.log("sync", start, end);
    let lastSyncedAt = PowerSync.currentStatus.lastSyncedAt;

    return new Promise(async (resolve, reject) => {
      const id = Supabase.currentSession.user.id;
		debugger;
      const timeoutId = setTimeout(() => {
        dispose();
		  debugger
        reject(new Error("Sync timed out after 5 seconds"));
      }, 5000);
		console.log("timeoutId", timeoutId);
		debugger;

      console.log("lastsyncedat 1", lastSyncedAt.getTime());
      console.log("update_sync_to");
      const { data, error } = await Supabase.client.rpc("update_sync_to", {
        start_value: start + 1,
        end_value: end,
        user_uuid: id,
      });
      console.log("data", data);
      console.log("error", error);
      console.log("lastsyncedat 2", lastSyncedAt.getTime());

      const dispose = PowerSync.registerListener({
        statusChanged: async (status) => {
          console.log("status", status.lastSyncedAt.getTime());
          if (status.lastSyncedAt.getTime() !== lastSyncedAt.getTime()) {
            console.log("synced", status.lastSyncedAt.getTime());
            dispose();
            clearTimeout(timeoutId);
            resolve();
          }
        },
      });

      // Set a timeout to abort the sync after 5 seconds
    });
  }
  async function getItems(start, end) {
    return new Promise(async (resolve) => {
      console.log("getItems", start, end);
      while (buffer.length < end) {
        const n = end - start;
        const s = buffer.length;

        await sync(s, s + n);
        let newRows = await execute(
          `SELECT * FROM syncto_list ORDER BY created_at LIMIT ? OFFSET ?`,
          [n, s]
        );
        newRows = newRows.rows._array.map((item, index) => ({
          ...item,
          id: buffer.length + index,
        }));

        console.log("newRows", newRows);
        buffer = [...buffer, ...newRows];
      }
      console.log("resolve", buffer.slice(start, end));
      resolve(buffer.slice(start, end));
    });
  }

  return {
    getItems,
    getItemCount: () => buffer.length,
  };
}
