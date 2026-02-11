document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector(".gallery-grid") || document.querySelector(".grid.gallery-grid");
  if (!grid) return;

  // Create the same structure as other videos in gallery.html
  const figure = document.createElement("figure");
  figure.className = "card tile reveal";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "media-open";
  btn.setAttribute("aria-label", "Открыть видео (новое)");
  btn.dataset.kind = "video";
  // For preview we point to first part; full playback will use parts list
  btn.dataset.src = "video_part_01.bin";
  btn.dataset.parts = "video_part_01.bin,video_part_02.bin,video_part_03.bin,video_part_04.bin,video_part_05.bin,video_part_06.bin,video_part_07.bin,video_part_08.bin,video_part_09.bin";

  const box = document.createElement("div");
  box.className = "video-box";
  // Horizontal like the first video: 16:9 (CSS already sets it, but keep explicit safety)
  box.style.aspectRatio = "16 / 9";

  const video = document.createElement("video");
  video.className = "media-video media-preview gallery-video";
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.controls = false;

  const source = document.createElement("source");
  source.src = "video_part_01.bin";
  // MOV parts; Safari plays it. Leaving type unset helps some browsers sniff.
  // source.type = "video/quicktime";

  video.appendChild(source);
  box.appendChild(video);
  btn.appendChild(box);
  figure.appendChild(btn);

  // Append to the very bottom
  grid.appendChild(figure);

  // Try to start playback silently
  const p = video.play();
  if (p && p.catch) p.catch(() => {});
});
