
document.addEventListener("DOMContentLoaded", () => {
  // Try to insert into an existing gallery container if present, otherwise append to body.
  const gallery =
    document.querySelector("#gallery") ||
    document.querySelector(".gallery") ||
    document.querySelector("[data-gallery]");

  const wrapper = document.createElement("div");
  wrapper.className = "gallery-item gallery-video-item";

  const video = document.createElement("video");
  video.controls = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.style.width = "100%";
  video.style.maxWidth = "900px";
  video.style.display = "block";
  video.style.margin = "24px auto";

  const status = document.createElement("div");
  status.style.textAlign = "center";
  status.style.opacity = "0.8";
  status.style.fontSize = "14px";
  status.style.margin = "8px 0 0";
  status.textContent = "Загрузка видео…";

  wrapper.appendChild(video);
  wrapper.appendChild(status);

  (gallery || document.body).appendChild(wrapper);

  const parts = ['video_part_01.bin', 'video_part_02.bin', 'video_part_03.bin', 'video_part_04.bin', 'video_part_05.bin', 'video_part_06.bin', 'video_part_07.bin', 'video_part_08.bin', 'video_part_09.bin'];

  async function loadPartsToBlob() {
    const buffers = [];
    let loaded = 0;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const res = await fetch("assets/video_parts/" + part, { cache: "force-cache" });
      if (!res.ok) throw new Error("Не удалось загрузить часть: " + part);
      const buf = await res.arrayBuffer();
      buffers.push(buf);
      loaded += buf.byteLength;
      const mb = (loaded / (1024*1024)).toFixed(1);
      status.textContent = "Загружено: " + (i+1) + "/" + parts.length + " (" + mb + " MB)";
    }

    // Concatenate
    const total = buffers.reduce((s, b) => s + b.byteLength, 0);
    const tmp = new Uint8Array(total);
    let offset = 0;
    for (const b of buffers) {
      tmp.set(new Uint8Array(b), offset);
      offset += b.byteLength;
    }

    // Original file is .mov (QuickTime). Most browsers play it in Safari; others may vary.
    // If your site targets Chrome/Android, consider converting to mp4 instead.
    const blob = new Blob([tmp], { type: "video/quicktime" });
    video.src = URL.createObjectURL(blob);
    status.textContent = "";
  }

  loadPartsToBlob().catch(err => {
    console.error(err);
    status.textContent = "Ошибка загрузки видео: " + err.message;
  });
});
