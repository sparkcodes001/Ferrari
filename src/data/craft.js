// Craft section media + copy. Everything here is editable.
// Drop files into  public/media/craft/  using these names.
// Missing files are fine: each slot shows a designed fallback until its media exists.
//   image = jpg/webp, 1920x1080 or larger (also used as the video poster)
//   video = mp4 (H.264, muted, loops), optional
export const CRAFT = {
  film: {
    kind: "film",
    video: "/media/craft/film.mp4",
    image: "/media/craft/film-poster.jpg",
    caption: "The Atelier",
  },
  chapters: [
    {
      no: "01",
      kind: "leather",
      title: "Leather",
      line: "Hides chosen by eye, cut by hand, stitched until the seam disappears.",
      meta: "Hand-stitched · Maranello",
      image: "/media/craft/leather.jpg",
      video: "/media/craft/leather.mp4",
    },
    {
      no: "02",
      kind: "carbon",
      title: "Carbon",
      line: "Layer by layer, cured under pressure. Light enough to vanish, strong enough to hold everything together.",
      meta: "Woven · Cured · Finished",
      image: "/media/craft/carbon.jpg",
      video: "/media/craft/carbon.mp4",
    },
    {
      no: "03",
      kind: "paint",
      title: "Paint",
      line: "Coat after coat, sanded by hand, until the red looks wet.",
      meta: "Rosso, the long way",
      image: "/media/craft/paint.jpg",
      video: "/media/craft/paint.mp4",
    },
  ],
};
