// Control data sync using client parameters
import { execute, reconnect } from "../powersync";

let pageNumber = 0;
let buffer = [];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function makePagedSyncSource() {
  async function getItems(start, end) {
	
	console.log("getItems", start, end);
	return new Promise(async (resolve) => {
      while (buffer.length - 1 < end) {
        pageNumber++;
        await reconnect(pageNumber);
        const rval = await execute(
          "SELECT * FROM paged_list ORDER BY created_at"
        );
        const newRows = rval.rows._array.map((item, index) => ({
          ...item,
          id: buffer.length + index
        }));
        buffer = [...buffer, ...newRows];
      }
      resolve(buffer.slice(start, end));
    });
  }

  return {
    getItems,
    getItemCount: () => buffer.length,
  };
}
