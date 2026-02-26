import { initPlayer } from "./player-core.js";
import { parseVTT } from "./subtitle-parser.js";
import { updateFontSize } from "./subtitle-size.js";
import { applyStyle } from "./subtitle-style.js";
import { saveRelativePosition } from "./subtitle-position.js";
import { saveSettings, loadSettings } from "./subtitle-save.js";

document.addEventListener("DOMContentLoaded", function () {

    const video = document.querySelector("video");
    const subtitle = document.getElementById("subtitle-preview");

    if (!video || !subtitle) {
        console.warn("Video or subtitle element not found.");
        return;
    }

    // 初期化
    initPlayer(video, subtitle);

    // テスト：フォントサイズ適用
    updateFontSize(video, subtitle, 4);

    // テスト：スタイル適用
    applyStyle(subtitle, {
        color: "white",
        font: "Arial",
        background: "transparent"
    });

    // 保存テスト
    saveSettings({
        font: "Arial",
        size: 4
    });

    console.log("testplayer.js loaded successfully.");
});
