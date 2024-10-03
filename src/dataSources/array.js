export default function makeArraySource() {
  const items = Array.from({ length: 10000 }, (_, i) => `Item ${i + 1}`);
  return {
    getItems: (start, end) => Promise.resolve(
      items.slice(start, end).map((item, index) => ({
        text: item,
        id: start + index
      }))
    ),
    getItemCount: () => Promise.resolve(items.length)
  };
}
