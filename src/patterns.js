const modules = import.meta.glob('../patterns/**/*.strudel', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const patterns = Object.fromEntries(
  Object.entries(modules)
    .map(([path, code]) => {
      const name = path.slice('../patterns/'.length, -'.strudel'.length);
      return [name, code];
    })
    .sort(([a], [b]) => a.localeCompare(b)),
);
