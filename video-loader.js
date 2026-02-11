document.addEventListener("DOMContentLoaded", () => {
  // Find the gallery grid container (as in existing markup)
  const grid = document.querySelector(".gallery-grid") || document.querySelector(".grid.gallery-grid");
  if (!grid) {
    console.warn("gallery grid not found");
    return;
  }

  // Build card like other videos
  const figure = document.createElement("figure");
  figure.className = "card tile reveal";

  const box = document.createElement("div");
  box.className = "video-box";
  // Portrait like the first video: 9:16
  box.style.aspectRatio = "9 / 16";

  const video = document.createElement("video");
  video.className = "media-video media-preview gallery-video";
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.controls = false;

  box.appendChild(video);
  figure.appendChild(box);

  // Append to the VERY bottom of the gallery grid
  grid.appendChild(figure);

  const parts = ['video_part_01.bin', 'video_part_02.bin', 'video_part_03.bin', 'video_part_04.bin', 'video_part_05.bin', 'video_part_06.bin', 'video_part_07.bin', 'video_part_08.bin', 'video_part_09.bin'];

  async function loadPartsToBlob() {
    const buffers = [];
    for (let i = 0; i < parts.length; i++) {
      const res = await fetch("./" + parts[i], { cache: "force-cache" });
      if (!res.ok) throw new Error("Не удалось загрузить часть: " + parts[i]);
      buffers.push(await res.arrayBuffer());
    }

    const total = buffers.reduce((s, b) => s + b.byteLength, 0);
    const tmp = new Uint8Array(total);
    let offset = 0;
    for (const b of buffers) {
      tmp.set(new Uint8Array(b), offset);
      offset += b.byteLength;
    }

    const blob = new Blob([tmp], { type: "video/quicktime" });
    video.src = URL.createObjectURL(blob);

    // Autoplay might be blocked; try play silently
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
  }

  loadPartsToBlob().catch(err => {
    console.error(err);
  });

  // Make it behave like other videos when user taps:
  // enable sound + controls + fullscreen
  figure.addEventListener("click", () => {
    try {
      video.muted = false;
      video.controls = true;
      const p = video.play();
      if (p && p.catch) p.catch(() => {});

      const req =
        video.requestFullscreen ||
        video.webkitRequestFullscreen ||
        video.mozRequestFullScreen ||
        video.msRequestFullscreen;

      if (req) req.call(video);
      else if (typeof video.webkitEnterFullscreen === "function") video.webkitEnterFullscreen();
    } catch (e) {}
  });
});
