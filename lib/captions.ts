import type { WordTimestamp } from "./types";

export type CaptionStyle =
  | "classic"
  | "bold-white"
  | "yellow-highlight";

function escapeAssText(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\n/g, " ");
}

function assTime(seconds: number) {
  const cs = Math.max(0, Math.round(seconds * 100));

  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;

  return `${h}:${String(m).padStart(2, "0")}:${String(
    s
  ).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
}

export function wordsForClip(
  words: WordTimestamp[],
  start: number,
  end: number
) {
  return words
    .filter((w) => w.end >= start && w.start <= end)
    .map((w) => ({
      ...w,
      start: Math.max(0, w.start - start),
      end: Math.max(0.1, w.end - start)
    }));
}

export function groupWordsIntoCaptionLines(
  words: WordTimestamp[],
  maxWords = 4
) {
  const lines: {
    words: WordTimestamp[];
    start: number;
    end: number;
  }[] = [];

  let buffer: WordTimestamp[] = [];

  const flush = () => {
    if (!buffer.length) return;

    lines.push({
      words: [...buffer],
      start: buffer[0].start,
      end: buffer[buffer.length - 1].end
    });

    buffer = [];
  };

  for (const word of words) {
    const gap = buffer.length
      ? word.start - buffer[buffer.length - 1].end
      : 0;

    if (buffer.length >= maxWords || gap > 0.65) {
      flush();
    }

    buffer.push(word);
  }

  flush();

  return lines;
}

function captionText(
  lineWords: WordTimestamp[],
  style: CaptionStyle
) {
  const words = lineWords.map((word) =>
    escapeAssText(word.word.toUpperCase())
  );

  if (style === "yellow-highlight") {
    return words
      .map(
        (word) =>
          `{\\c&H00E5FF&\\fs92\\bord8\\shad3}${word}{\\c&HFFFFFF&\\fs80\\bord7\\shad3}`
      )
      .join(" ");
  }

  return words.join(" ");
}

function styleLine(style: CaptionStyle) {
  if (style === "classic") {
    return "Style: Default,Arial,72,&H00FFFFFF,&H0000FFFF,&H00000000,&H99000000,-1,0,0,0,100,100,0,0,1,5,2,2,80,80,230,1";
  }

  if (style === "bold-white") {
    return "Style: Default,Arial,88,&H00FFFFFF,&H0000FFFF,&H00000000,&H99000000,-1,0,0,0,100,100,1,0,1,8,3,2,70,70,260,1";
  }

  return "Style: Default,Arial,80,&H00FFFFFF,&H0000FFFF,&H00000000,&H99000000,-1,0,0,0,100,100,1,0,1,7,3,2,70,70,260,1";
}

export function createAssSubtitles(
  words: WordTimestamp[],
  title = "Podcast Clip",
  style: CaptionStyle = "yellow-highlight"
) {
  const lines = groupWordsIntoCaptionLines(words, 4);

  const events = lines
    .map((line) => {
      const text = captionText(line.words, style);

      return `Dialogue: 0,${assTime(line.start)},${assTime(
        line.end
      )},Default,,0,0,0,,${text}`;
    })
    .join("\n");

  return `[Script Info]
Title: ${escapeAssText(title)}
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
${styleLine(style)}

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
${events}
`;
}