// subtitle-parser.js

let parsedCues = [];

function parseVTT(text, video, subtitle) {

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

        const rawText = textLines.join(" ");

        const maxWidth = video.clientWidth * 0.9;

        const measure = document.createElement("div");
        measure.style.position = "absolute";
        measure.style.visibility = "hidden";
        measure.style.whiteSpace = "nowrap";
        measure.style.fontSize = subtitle.style.fontSize;
        measure.style.fontFamily = subtitle.style.fontFamily;
        measure.style.fontWeight = subtitle.style.fontWeight;

        document.body.appendChild(measure);

        measure.innerText = rawText;

        let finalText = rawText;

        if (measure.offsetWidth > maxWidth) {

            let line1 = "";
            let line2 = "";

            for (let char of rawText) {

                measure.innerText = line1 + char;

                if (measure.offsetWidth > maxWidth) {

                    if (line1 === "") {
                        line1 = char;
                        line2 = rawText.slice(1);
                    } else {
                        line2 = rawText.slice(line1.length);
                    }

                    break;
                } else {
                    line1 += char;
                }
            }

            measure.innerText = line2;

            while (measure.offsetWidth > maxWidth && line2.length > 0) {
                line2 = line2.slice(0, -1);
                measure.innerText = line2;
            }

            finalText = line2 ? line1 + "<br>" + line2 : line1;
        }

        document.body.removeChild(measure);

        parsedCues.push({
            start: startSec,
            end: endSec,
            text: finalText
        });

    });
}

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

window.parseVTT = parseVTT;
window.parsedCues = parsedCues;
