// subtitle-style.js

function applyProfessionalSettings(subtitle) {

    const outlinePreset = document.getElementById("outlinePreset");
    const shadowPreset = document.getElementById("shadowPreset");
    const boxPreset = document.getElementById("boxPreset");

    let outlineShadow = "";
    let dropShadow = "";

    if (outlinePreset) {

        const map = {
            none: { outline: "0", color: "#000" },
            thin: { outline: "1", color: "#000" },
            thick: { outline: "3", color: "#000" },
            white: { outline: "3", color: "#fff" }
        };

        const selected = map[outlinePreset.value];
        const px = parseInt(selected.outline);

        if (px > 0) {
            outlineShadow =
                `-${px}px -${px}px 0 ${selected.color},
                 ${px}px -${px}px 0 ${selected.color},
                -${px}px  ${px}px 0 ${selected.color},
                 ${px}px  ${px}px 0 ${selected.color}`;
        }
    }

    if (shadowPreset) {

        const shadowMap = {
            none: "",
            soft: "0px 0px 8px rgba(0,0,0,0.6)",
            strong: "3px 3px 6px rgba(0,0,0,0.9)"
        };

        dropShadow = shadowMap[shadowPreset.value];
    }

    subtitle.style.textShadow =
        [outlineShadow, dropShadow]
        .filter(s => s !== "")
        .join(",");
}

window.applyProfessionalSettings = applyProfessionalSettings;
