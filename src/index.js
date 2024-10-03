import { loginAnon, openDatabase } from "@/powersync";

// Sync limited data and then load more data from an API
import { Supabase, PowerSync, execute } from "@/powersync";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function renderListItems(visibleItems) {
  const list = document.querySelector("#itemList");

  //   const startIndex = Math.max(0, firstVisibleIndex - config.itemsPerPage);
  const listItems = visibleItems
    .map(
      (item, index) =>
        `<li data-index="${index}" data-id="${item.id}">${item.text}</li>`
    )
    .join("");

  const items = document.querySelector("#itemList");
  items.innerHTML = listItems;
}

export default async function makeTriggerSyncSource() {
  let buffer = [];
  async function sync(start, end) {
    console.log("sync", start, end);
    let lastSyncedAt = PowerSync.currentStatus.lastSyncedAt;

    return new Promise(async (resolve, reject) => {
      const id = Supabase.currentSession.user.id;

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
            resolve();
          }
        },
      });

      // Set a timeout to abort the sync after 5 seconds
      const timeoutId = setTimeout(() => {
        dispose();
        reject(new Error("Sync timed out after 5 seconds"));
      }, 10000);
    });
  }

  async function getItems(start, end) {
    return new Promise(async (resolve) => {
      console.log("getItems", start, end);
      while (buffer.length < end) {
        const n = end - start;
        const s = buffer.length;

        try {
          await sync(s, s + n);
        } catch (e) {
          alert(e.message);
          throw e;
        }
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

const PageSize = 10;
let source;
let start = 0;

async function getMore() {
  try {
    const items = await source.getItems(start, start + PageSize);

    renderListItems(items);
    start += PageSize;
  } catch (e) {
    alert(e.message);
  }
}
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("getMore").addEventListener("click", getMore);

  await openDatabase();
  await loginAnon();

  source = await makeTriggerSyncSource();
  document.getElementById("getMore").disabled = false;
});
