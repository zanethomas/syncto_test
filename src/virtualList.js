export default function makeVirtualList(config) {
  const { dataSource, bufferSize, itemsPerPage } = config;
  let currentIndex = 0;

  async function getItems(startIndex) {
	console.log("getItems startIndex", startIndex);
    const start = Math.max(0, startIndex - bufferSize);
    const count = await dataSource.getItemCount() || bufferSize;
    const end = Math.min(count,
      startIndex + itemsPerPage + bufferSize
    );
    const rows = await dataSource.getItems(start, end);
    return rows;
  }

  async function getItemCount() {
    return dataSource.getItemCount();
  }

  async function setIndex(index) {
    currentIndex = Math.max(
      0,
      Math.min((await dataSource.getItemCount()) - itemsPerPage, index)
    );
  }

  return {
    makeVirtualList,
    bufferSize,
    itemsPerPage,
    bufferSize,
    getItemCount,
    getItems,
    setIndex,
  };
}
