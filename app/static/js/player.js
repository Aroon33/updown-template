let styleConfig = Object.assign({
    font_ratio: 0.06,
    vertical_ratio: 0.08,
    alignment: 2,
    fontname: "Noto Sans JP",
    fontcolor: "&H00FFFFFF",
    outline: 3,
    shadow: 1,
    box_enabled: false,
    box_color: "&H00000000",
    box_opacity: "00"
}, window.initialStyle || {});

let vttEnabled = true;

document.addEventListener("DOMContentLoaded", function () {

    const video = document.querySelector("video");
    const preview = document.getElementById("subtitle-preview");

    function getVideoRect() {
        return video.getBoundingClientRect();
    }

    // 🔥 フォントサイズ更新（ratio）
    function updateFontSize() {
        const { height } = getVideoRect();
        if (!height) return;

        const px = height * styleConfig.font_ratio;
        preview.style.fontSize = px + "px";
    }

    // 🔥 位置更新（ratio）
function updatePosition() {

    const { height } = getVideoRect();
    if (!height) return;

    // 下配置
    if (styleConfig.alignment === 2) {
        preview.style.bottom = height * styleConfig.vertical_ratio + "px";
        preview.style.top = "";
        preview.style.transform = "";
    }

    // 中央配置
    if (styleConfig.alignment === 5) {
        preview.style.top = "50%";
        preview.style.bottom = "";
        preview.style.transform = "translate(-50%, -50%)";
        preview.style.left = "50%";
    }

    // 上配置
    if (styleConfig.alignment === 8) {
        preview.style.top = height * styleConfig.vertical_ratio + "px";
        preview.style.bottom = "";
        preview.style.transform = "translateX(-50%)";
        preview.style.left = "50%";
    }
}

    function toggleBox(enabled){
        styleConfig.box_enabled = enabled;
    }

    function setBoxColor(color){
        styleConfig.box_color = color;
    }

    function setBoxOpacity(opacity){
        styleConfig.box_opacity = opacity;
    }

    // 🔥 フォントサイズ変更
    window.changeSize = function (delta) {

        styleConfig.font_ratio += delta;

        if (styleConfig.font_ratio < 0.01) styleConfig.font_ratio = 0.01;
        if (styleConfig.font_ratio > 0.2) styleConfig.font_ratio = 0.2;

        document.getElementById("sizeDisplay").innerText =
            Math.round(styleConfig.font_ratio * 100);

        updateFontSize();
    };

    // 🔥 位置プリセット
    window.setPositionPreset = function (type) {

        if (type === "bottom") {
            styleConfig.vertical_ratio = 0.08;
            styleConfig.alignment = 2;
        }

        if (type === "middle") {
            styleConfig.vertical_ratio = 0.3;
            styleConfig.alignment = 5;
        }

        if (type === "top") {
            styleConfig.vertical_ratio = 0.6;
            styleConfig.alignment = 8;
        }

        updatePosition();
    };

    function updateOutlineAndShadow() {

        preview.style.textShadow = "";

        if (styleConfig.outline > 0) {
           preview.style.textShadow =
               `-${styleConfig.outline}px 0 0 black,
                ${styleConfig.outline}px 0 0 black,
                0 -${styleConfig.outline}px 0 black,
                0 ${styleConfig.outline}px 0 black`;
       }

       if (styleConfig.shadow > 0) {
           preview.style.textShadow +=
               ` ${styleConfig.shadow * 2}px ${styleConfig.shadow * 2}px 4px rgba(0,0,0,0.7)`;
       }
    } 

    // 🔥 フォント変更
    const fontSelect = document.getElementById("fontSelect");
    if (fontSelect) {
        fontSelect.addEventListener("change", function () {
            preview.style.fontFamily = `'${this.value}', sans-serif`;
            styleConfig.fontname = this.value;
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
            styleConfig.fontcolor = this.value;
        });
    }

    const outlinePreset = document.getElementById("outlinePreset");

    if (outlinePreset) {
        outlinePreset.addEventListener("change", function () {

        if (this.value === "none") {
            styleConfig.outline = 0;
            styleConfig.outlinecolor = "&H00000000";
        }

        if (this.value === "thin") {
            styleConfig.outline = 2;
            styleConfig.outlinecolor = "&H00000000";
        }

        if (this.value === "thick") {
            styleConfig.outline = 4;
            styleConfig.outlinecolor = "&H00000000";
        }

        if (this.value === "white") {
            styleConfig.outline = 4;
            styleConfig.outlinecolor = "&H00FFFFFF";
        }

        updateOutlineAndShadow();

     });
}
    const shadowPreset = document.getElementById("shadowPreset");

    if (shadowPreset) {
        shadowPreset.addEventListener("change", function () {

        if (this.value === "none") {
            styleConfig.shadow = 0;
        }

        if (this.value === "soft") {
            styleConfig.shadow = 1;
        }

        if (this.value === "strong") {
            styleConfig.shadow = 3;
        }

        updateOutlineAndShadow();

    });
}

    const boxPreset = document.getElementById("boxPreset");

    if (boxPreset) {
        boxPreset.addEventListener("change", function () {

            if (this.value === "none") {
                styleConfig.box_enabled = false;
                preview.style.background = "transparent";
                preview.style.borderRadius = "0";
            }

            if (this.value === "dark") {
                styleConfig.box_enabled = true;
                styleConfig.box_color = "&H00000000";
                styleConfig.box_opacity = "AA";
                preview.style.background = "rgba(0,0,0,0.6)";
                preview.style.borderRadius = "0";
            } 

            if (this.value === "light") {
                styleConfig.box_enabled = true;
                styleConfig.box_color = "&H00FFFFFF";
                styleConfig.box_opacity = "AA";
                preview.style.background = "rgba(255,255,255,0.6)";
                preview.style.borderRadius = "0";
            }

            if (this.value === "rounded") {
                styleConfig.box_enabled = true;
                styleConfig.box_color = "&H00000000";
                styleConfig.box_opacity = "AA";
                preview.style.background = "rgba(0,0,0,0.6)";
                preview.style.borderRadius = "10px";
            }
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


    // 🔥 VTTフォントサイズ変更
    window.changeVttSize = function (delta) {

        const root = document.documentElement;

        let current = parseFloat(
           getComputedStyle(root)
           .getPropertyValue('--vtt-size')
        ) || 20;

        let newSize = current + delta;

        if (newSize < 10) newSize = 10;
        if (newSize > 60) newSize = 60;

        root.style.setProperty('--vtt-size', newSize + "px");
    };

    window.toggleHtmlPreview = function () {
        const el = document.getElementById("subtitle-preview");
        if (el.style.display === "none") {
            el.style.display = "block";
        } else {
            el.style.display = "none";
        }
    };

    // 🔥 プレビューテキスト
    const previewInput = document.getElementById("sampleTextInput");
    if (previewInput) {
        previewInput.addEventListener("input", function () {
            preview.innerHTML = this.value.replace(/\n/g, "<br>");
        });
    }


    const toggleBtn = document.getElementById("togglePanelBtn");
    const panel = document.getElementById("controlPanel");

    if (toggleBtn && panel) {
        toggleBtn.addEventListener("click", function () {
            panel.classList.toggle("open");
        });
    }

    // 🔥 VTT保存
    window.saveVTT = function () {

        fetch("/save/" + projectId, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "filetype=vtt&content=" +
              encodeURIComponent(
                  document.getElementById("vttEditor").value
              )
        })
        .then(response => response.text())
        .then(data => {
            alert("VTT保存完了");
            location.reload();   // 🔥 保存後に再読込
        })
        .catch(err => {
            alert("保存失敗");
            console.error(err);
        });
    };

    // 🔥 スタイル保存
    window.saveStyle = function () {

        fetch(`/save_style/${window.projectId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(styleConfig)
        }).then(res => {
            if (res.ok) {
                alert("保存完了");
            }
        });
    };

    window.applyPreset = function () {

        const layout = document.getElementById("layoutSelect").value;
        const preset = document.getElementById("presetSelect").value;

        fetch(`/apply_preset/${window.projectId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
        },
            body: JSON.stringify({
                layout: layout,
                preset: preset
            })
        }).then(res => {
            if (res.ok) {
                location.reload();
            }
        });
   };

    // 初期化
    video.addEventListener("loadedmetadata", function () {
        updateFontSize();
        updatePosition();
    });

});