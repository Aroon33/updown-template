// subtitle-size.js

let size = 4;

function updateFontSize(video, subtitle) {

    const percent = size / 100;
    const videoWidth = video.clientWidth;
    if (!videoWidth) return;

    const calculatedSize = videoWidth * percent;
    subtitle.style.fontSize = calculatedSize + "px";

    const fsInput = document.getElementById("fontsizeInput");
    if (fsInput) fsInput.value = Math.round(calculatedSize);

    const sizePercentInput = document.getElementById("sizePercentInput");
    const sizePreset = document.getElementById("sizePreset");

    if (sizePercentInput) sizePercentInput.value = size;
    if (sizePreset) sizePreset.value = size;
}

function changeSize(amount, video, subtitle, vttData) {

    size += amount;
    if (size < 1) size = 1;
    if (size > 15) size = 15;

    const sizeDisplay = document.getElementById("sizeDisplay");
    if (sizeDisplay) sizeDisplay.innerText = size;

    updateFontSize(video, subtitle);

    if (window.parseVTT && vttData) {
        window.parseVTT(vttData, video, subtitle);
    }
}

window.updateFontSize = updateFontSize;
window.changeSize = changeSize;
