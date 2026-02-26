// subtitle-position.js

let dragging = false;
let offsetX = 0;
let offsetY = 0;

function setPositionPreset(type, video, subtitle) {

    const width = video.clientWidth;
    const height = video.clientHeight;

    let x = width / 2 - subtitle.offsetWidth / 2;
    let y;

    if (type === "bottom") y = height * 0.85 - subtitle.offsetHeight;
    if (type === "middle") y = height * 0.5 - subtitle.offsetHeight / 2;
    if (type === "top") y = height * 0.1;

    x = Math.max(0, Math.min(x, width - subtitle.offsetWidth));
    y = Math.max(0, Math.min(y, height - subtitle.offsetHeight));

    subtitle.style.left = x + "px";
    subtitle.style.top = y + "px";

    saveVideoRelativePosition(video, subtitle);
}

function saveVideoRelativePosition(video, subtitle) {

    const ratioX = subtitle.offsetLeft / video.clientWidth;
    const ratioY = subtitle.offsetTop / video.clientHeight;

    const posXInput = document.getElementById("posXInput");
    const posYInput = document.getElementById("posYInput");

    if (posXInput) posXInput.value = ratioX;
    if (posYInput) posYInput.value = ratioY;
}

window.setPositionPreset = setPositionPreset;
window.saveVideoRelativePosition = saveVideoRelativePosition;
