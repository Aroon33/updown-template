let sizePercent = 4;   // 画面幅に対する％
let vttEnabled = true;

document.addEventListener("DOMContentLoaded", function () {

    const video = document.querySelector("video");
    const preview = document.getElementById("subtitle-preview");
    const sizeDisplay = document.getElementById("sizeDisplay");
    const fontsizeInput = document.getElementById("fontsizeInput");
    const marginvInput = document.getElementById("marginvInput");
    const fontcolorInput = document.getElementById("fontcolorInput");
    const fontnameInput = document.getElementById("fontnameInput");

    sizeDisplay.innerText = sizePercent;

    // 🔥 表示サイズ基準で計算
    function getDisplayedVideoSize() {
        const rect = video.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height
        };
    }

    function updateFontSize() {
        const percent = parseFloat(sizeDisplay.innerText) / 100;
        const { width } = getDisplayedVideoSize();
        if (!width) return;

        const calculatedSize = width * percent;

        preview.style.fontSize = calculatedSize + "px";
        fontsizeInput.value = Math.round(calculatedSize);
    }

    window.changeSize = function (amount) {
        sizePercent += amount;
        if (sizePercent < 1) sizePercent = 1;
        if (sizePercent > 20) sizePercent = 20;

        sizeDisplay.innerText = sizePercent;
        updateFontSize();
    };

    // 🔥 位置制御（ASS完全一致）
    function updatePosition(percent) {
        const { height } = getDisplayedVideoSize();
        if (!height) return;

        const bottomPx = height * percent;

        preview.style.bottom = bottomPx + "px";
        preview.style.top = "";
        preview.style.transform = "";

        marginvInput.value = Math.round(bottomPx);
    }

    const positionSlider = document.getElementById("positionSlider");
    if (positionSlider) {
        positionSlider.addEventListener("input", function () {
            const percent = this.value / 100;
            updatePosition(percent);
        });
    }

    window.setPositionPreset = function (type) {

        let percent = 0.05; // default bottom

        if (type === "bottom") percent = 0.05;
        if (type === "middle") percent = 0.30;
        if (type === "top") percent = 0.60;

        if (positionSlider) {
            positionSlider.value = percent * 100;
        }

        updatePosition(percent);
    };

    // 🔥 フォント変更
    const fontSelect = document.getElementById("fontSelect");
    if (fontSelect) {
        fontSelect.addEventListener("change", function () {
            const font = this.value;
            preview.style.fontFamily = `'${font}', sans-serif`;
            fontnameInput.value = font;
        });
    }

    // 🔥 色変更
    const colorSelect = document.getElementById("colorSelect");
    if (colorSelect) {
        colorSelect.addEventListener("change", function () {

            const colorMap = {
                "&H00FFFFFF": "white",
                "&H000000FF": "red",
                "&H0000FFFF": "yellow",
                "&H00FF0000": "blue",
                "&H00000000": "black"
            };

            preview.style.color = colorMap[this.value];
            fontcolorInput.value = this.value;
        });
    }

    // 🔥 VTT ON/OFF
    window.toggleVTT = function () {
        const tracks = video.textTracks;
        if (tracks.length > 0) {
            if (vttEnabled) {
                tracks[0].mode = "hidden";
                vttEnabled = false;
            } else {
                tracks[0].mode = "showing";
                vttEnabled = true;
            }
        }
    };

    // 🔥 プレビューテキスト
    const previewInput = document.getElementById("previewInput");
    if (previewInput) {
        previewInput.addEventListener("input", function () {
            preview.innerHTML = this.value.replace(/\n/g, "<br>");
        });
    }

    // 初期化
    video.addEventListener("loadedmetadata", function () {
        updateFontSize();
        updatePosition(0.05);
    });

});






＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿

let size = 4;
let dragging = false;
let offsetX = 0;
let offsetY = 0;
let vttData = "";
let parsedCues = [];
let vttEnabled = true;
let previewMode = false;

document.addEventListener("DOMContentLoaded", function () {

    const video = document.querySelector("video");
    const subtitle = document.getElementById("subtitle-preview");
    const vttLayer = document.getElementById("vtt-layer");
    const previewLayer = document.getElementById("preview-layer");
    const vttEditor = document.getElementById("vttEditor");

    subtitle.style.position = "absolute";
    subtitle.style.cursor = "move";

    // =========================
    // VTT 読み込み
    // =========================
    fetch(video.querySelector("track").src)
        .then(res => res.text())
        .then(text => {
            vttData = text;
            if (vttEditor) vttEditor.value = text;
         parseVTT(text);
        });

    // =========================
    // 保存済み設定の初期適用
    // =========================

    if (typeof savedSettings !== "undefined" &&
        savedSettings &&
        Object.keys(savedSettings).length > 0) {

        if (savedSettings.fontsize_ratio) {
            size = parseInt(savedSettings.fontsize_ratio);
            document.getElementById("sizeDisplay").innerText = size;
            updateFontSize();
        }

        if (savedSettings.fontcolor) {
            subtitle.style.color = savedSettings.fontcolor;
            document.getElementById("fontcolorInput").value =
                savedSettings.fontcolor;
        }

        if (savedSettings.fontname) {
            subtitle.style.fontFamily =
                savedSettings.fontname + ", sans-serif";
            document.getElementById("fontnameInput").value =
                savedSettings.fontname;
        }
    }

    // =========================
    // VTT パース（完全版）
    // =========================
    function parseVTT(text) {

    parsedCues = [];
    const blocks = text.split(/\n\s*\n/);

    blocks.forEach(block => {

        const lines = block.trim().split("\n");
        if (lines.length < 2) return;

        let timeLine = null;
        let textLines = [];

        if (lines[0].includes("-->")) {
            timeLine = lines[0];
            textLines = lines.slice(1);
        }
        else if (lines.length >= 3 && lines[1].includes("-->")) {
            timeLine = lines[1];
            textLines = lines.slice(2);
        }
        else {
            return;
        }

        const parts = timeLine.split("-->");
        if (parts.length !== 2) return;

        const startSec = toSeconds(parts[0].trim());
        const endSec = toSeconds(parts[1].trim());

        if (isNaN(startSec) || isNaN(endSec)) return;

        parsedCues.push({
            start: startSec,
            end: endSec,
            text: textLines.join("<br>")
        });
    });
}

    // =========================
    // 時間変換
    // =========================
    function toSeconds(time) {

        time = time.replace(",", ".").trim();
        const parts = time.split(":");

        if (parts.length === 3) {
            return (
                parseFloat(parts[0]) * 3600 +
                parseFloat(parts[1]) * 60 +
                parseFloat(parts[2])
            );
        }

        if (parts.length === 2) {
            return (
                parseFloat(parts[0]) * 60 +
                parseFloat(parts[1])
            );
        }

        return NaN;
    }

    // =========================
    // 再生同期表示
    // =========================
    video.ontimeupdate = function () {

       const current = video.currentTime;

       const active = parsedCues.find(c =>
           current >= c.start && current <= c.end
       );

       vttLayer.innerHTML = active ? active.text : "";
    };

    // =========================
    // 保存（AJAX）
    // =========================
    window.saveVTT = function () {

        if (!vttEditor) return;

        const content = vttEditor.value;

        fetch(window.location.pathname.replace("/play", "/save"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                filetype: "vtt",
                content: content
            })
        }).then(res => {
            if (res.ok) {
                parseVTT(content);
            }
        });
    };

    // =========================
    // フォントサイズ
    // =========================
function updateFontSize() {

    const percent = size / 100;
    const rect = video.getBoundingClientRect();

    const calculatedSize = rect.width * percent;

    subtitle.style.fontSize = calculatedSize + "px";
    document.getElementById("fontsizeInput").value =
        Math.round(calculatedSize);
}

    window.changeSize = function (amount) {

        size += amount;

        if (size < 1) size = 1;
        if (size > 15) size = 15;

        document.getElementById("sizeDisplay").innerText = size;
        updateFontSize();
    };

    video.addEventListener("loadedmetadata", updateFontSize);

// =========================
// サンプルテキストプレビュー
// =========================
    const sampleInput = document.getElementById("sampleTextInput");

    if (sampleInput) {
        sampleInput.addEventListener("input", function() {
           previewLayer.innerHTML =
            this.value.replace(/\n/g, "<br>");
       });
   }


    // 背景
    document.getElementById("boxPreset").addEventListener("change", function() {

        if (this.value === "none") {
            subtitle.style.background = "transparent";
            subtitle.style.borderRadius = "0";
        }

        if (this.value === "dark") {
            subtitle.style.background = "rgba(0,0,0,0.6)";
        }

        if (this.value === "rounded") {
            subtitle.style.background = "rgba(0,0,0,0.6)";
            subtitle.style.borderRadius = "10px";
        }
    });

    // =========================
    // 影変更
    // =========================

    const shadowPreset = document.getElementById("shadowPreset");

    if (shadowPreset) {
        shadowPreset.addEventListener("change", function () {

        const shadowMap = {
            none: "0",
            soft: "1",
            strong: "3"
        };

        subtitle.style.textShadow =
            this.value === "none"
                ? "none"
                : this.value === "soft"
                    ? "0 0 8px rgba(0,0,0,0.6)"
                    : "3px 3px 6px rgba(0,0,0,0.9)";

        document.getElementById("shadowInput").value =
            shadowMap[this.value];
        });
    }

    // =========================
    // 枠変更
    // =========================


    const outlinePreset = document.getElementById("outlinePreset");

    if (outlinePreset) {
        outlinePreset.addEventListener("change", function () {

        const map = {
            none: { outline: "0", color: "&H00000000" },
            thin: { outline: "1", color: "&H00000000" },
            thick: { outline: "3", color: "&H00000000" },
            white: { outline: "3", color: "&H00FFFFFF" }
        };

        const selected = map[this.value];

        document.getElementById("outlineInput").value = selected.outline;
        document.getElementById("outlineColorInput").value = selected.color;
     });
    }

    // =========================
    // 背景変更
    // =========================

    const boxPreset = document.getElementById("boxPreset");

    if (boxPreset) {
        boxPreset.addEventListener("change", function () {

        const boxInput = document.getElementById("boxInput");
        const boxColorInput = document.getElementById("boxColorInput");

        if (this.value === "none") {
            subtitle.style.background = "transparent";
            subtitle.style.borderRadius = "0";
            if (boxInput) boxInput.value = "0";
        }

        if (this.value === "dark") {
            subtitle.style.background = "rgba(0,0,0,0.6)";
            if (boxInput) boxInput.value = "1";
            if (boxColorInput) boxColorInput.value = "&H64000000";
        }

        if (this.value === "light") {
            subtitle.style.background = "rgba(255,255,255,0.6)";
            if (boxInput) boxInput.value = "1";
            if (boxColorInput) boxColorInput.value = "&H64FFFFFF";
        }

        if (this.value === "rounded") {
            subtitle.style.background = "rgba(0,0,0,0.6)";
            subtitle.style.borderRadius = "10px";
            if (boxInput) boxInput.value = "1";
            if (boxColorInput) boxColorInput.value = "&H64000000";
        }
    });
}

    // =========================
    // 色変更
    // =========================
    const colorSelect = document.getElementById("colorSelect");

    if (colorSelect) {
        colorSelect.addEventListener("change", function () {

            const colorMap = {
                "&H00FFFFFF": "white",
                "&H000000FF": "red",
                "&H0000FFFF": "yellow",
                "&H00FF0000": "blue",
                "&H00000000": "black"
            };

            subtitle.style.color = colorMap[this.value];
            document.getElementById("fontcolorInput").value = this.value;
        });
    }

    // =========================
    // フォント変更
    // =========================
    const fontSelect = document.getElementById("fontSelect");

    if (fontSelect) {
        fontSelect.addEventListener("change", function () {

            subtitle.style.fontFamily = `'${this.value}', sans-serif`;
            document.getElementById("fontnameInput").value = this.value;
        });
    }

    // =========================
    // プリセット位置
    // =========================
    window.setPositionPreset = function (type) {

        const rect = video.getBoundingClientRect();

        let x = rect.width / 2 - subtitle.offsetWidth / 2;
        let y;

        if (type === "bottom") y = rect.height * 0.85;
        if (type === "middle") y = rect.height * 0.5;
        if (type === "top") y = rect.height * 0.1;

        subtitle.style.left = x + "px";
        subtitle.style.top = y + "px";

        saveVideoRelativePosition(x, y);
    };

    // =========================
    // ドラッグ
    // =========================
    subtitle.addEventListener("mousedown", function(e) {
        dragging = true;
        offsetX = e.offsetX;
        offsetY = e.offsetY;
    });

    document.addEventListener("mouseup", function() {
        dragging = false;
    });

    document.addEventListener("mousemove", function(e) {

        if (!dragging) return;

        const rect = video.getBoundingClientRect();

        let x = e.clientX - rect.left - offsetX;
        let y = e.clientY - rect.top - offsetY;

        x = Math.max(0, Math.min(x, rect.width - subtitle.offsetWidth));
        y = Math.max(0, Math.min(y, rect.height - subtitle.offsetHeight));

        subtitle.style.left = x + "px";
        subtitle.style.top = y + "px";

        saveVideoRelativePosition(x, y);
    });

function saveVideoRelativePosition(displayX, displayY) {

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (!videoWidth || !videoHeight) return;

    const rect = video.getBoundingClientRect();

    const percentX = (displayX + subtitle.offsetWidth / 2) / rect.width;
    const percentY = (displayY + subtitle.offsetHeight / 2) / rect.height;

    const realX = Math.round(videoWidth * percentX);
    const realY = Math.round(videoHeight * percentY);

    document.getElementById("posXInput").value = realX;
    document.getElementById("posYInput").value = realY;
}

function saveSubtitleSettings() {

    const settings = {
        fontsize_ratio: size,
        fontcolor: document.getElementById("fontcolorInput").value,
        fontname: document.getElementById("fontnameInput").value,
        posx: document.getElementById("posXInput").value,
        posy: document.getElementById("posYInput").value
    };

    fetch(`/save_settings/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
    })
    .then(res => res.json())
    .then(data => {
        alert("保存しました");
    });
}

// =========================
// VTT ON/OFF
// =========================
let vttVisible = true;

window.toggleVTT = function () {

    vttVisible = !vttVisible;

    if (vttVisible) {
        vttLayer.style.display = "block";
    } else {
        vttLayer.style.display = "none";
    }
};


// =========================
// モーダル制御
// =========================
    window.openVTTModal = function () {
        const modal = document.getElementById("vttModal");
        if (modal) modal.style.display = "block";
    };

    window.closeVTTModal = function () {
        const modal = document.getElementById("vttModal");
        if (modal) modal.style.display = "none";
    };

    // =========================
    // サイドバー開閉
    // =========================
    const toggleBtn = document.getElementById("togglePanelBtn");
    const panel = document.getElementById("controlPanel");

    if (toggleBtn && panel) {

        toggleBtn.addEventListener("click", function () {
            console.log("clicked");
            panel.classList.toggle("open");
        });

        document.addEventListener("click", function (event) {
            console.log("document clicked");

            const insidePanel = panel.contains(event.target);
            const onButton = toggleBtn.contains(event.target);

            if (!insidePanel && !onButton) {
                panel.classList.remove("open");
            }
        });
    }

});