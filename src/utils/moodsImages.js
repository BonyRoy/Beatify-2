/**
 * Background images for Moods grid (phone view).
 * Used in repeat when there are more mood items than images.
 */
const modules = import.meta.glob("../assets/moods/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
const MOODS_IMAGES = Object.keys(modules)
  .sort()
  .map((k) => modules[k]);

export { MOODS_IMAGES };
