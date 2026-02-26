// subtitle-save.js

function saveVTT(vttEditor) {

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
        if (res.ok && window.parseVTT) {
            window.parseVTT(content);
        }
    });
}

window.saveVTT = saveVTT;
