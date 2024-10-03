// Pre-sync all data and query the local database
import { execute } from "../powersync";

export default function makePreSyncSource() {
  return {
    getItems: async (start, end) => {
      const rval = await execute(
        "SELECT * FROM list ORDER BY created_at LIMIT ? OFFSET ?",
        [end - start, start]
      );
      return rval.rows._array;
    },
    getItemCount: async () => {
      const rval = await execute("SELECT COUNT(*) FROM list");
      return rval.rows._array[0]["COUNT(*)"];
    },
  };
}
