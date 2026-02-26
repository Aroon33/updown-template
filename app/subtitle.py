import os

def vtt_to_ass(
    vtt_path,
    ass_path,
    width,
    height,
    fontsize="42",
    fontcolor="&H00FFFFFF",
    outlinecolor="&H00000000",
    outline="3",
    shadow="1",
    fontname="Arial",
    bold="0",
    spacing="0",
    posx=None,
    posy=None,
    box="0",
    boxcolor="&H64000000"
):

    def convert_time(vtt_time):
        vtt_time = vtt_time.replace(",", ".")
        parts = vtt_time.split(":")

        if len(parts) == 2:
            m, s = parts
            return f"0:{int(m):02}:{float(s):05.2f}"
        elif len(parts) == 3:
            h, m, s = parts
            return f"{int(h)}:{int(m):02}:{float(s):05.2f}"

        return "0:00:00.00"

    if box == "1":
        borderstyle = "3"
        backcolour = boxcolor
    else:
        borderstyle = "1"
        backcolour = "&H00000000"

    with open(vtt_path, "r", encoding="utf-8") as vtt:
        lines = vtt.readlines()

    with open(ass_path, "w", encoding="utf-8") as ass:

        ass.write(f"""[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,{fontname},{fontsize},{fontcolor},&H00000000,{outlinecolor},{backcolour},{bold},0,0,0,100,100,{spacing},0,{borderstyle},{outline},{shadow},2,10,10,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""")

        i = 0
        while i < len(lines):
            if "-->" in lines[i]:
                start_raw, end_raw = lines[i].split("-->")
                start = convert_time(start_raw.strip())
                end = convert_time(end_raw.strip())

                i += 1
                text_lines = []

                while i < len(lines) and lines[i].strip() != "":
                    text_lines.append(lines[i].strip())
                    i += 1

                text = r"\N".join(text_lines)

                if posx and posy:
                    text = f"{{\\pos({posx},{posy})}}{text}"

                ass.write(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}\n")

            else:
                i += 1
