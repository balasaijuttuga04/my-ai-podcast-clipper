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

  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(
    2,
    "0"
  )}.${String(c).padStart(2, "0")}`;
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
  const groups: WordTimestamp[][] = [];
  let current: WordTimestamp[] = [];

  for (const word of words) {
    const prev = current[current.length - 1];
    const gap = prev ? word.start - prev.end : 0;

    if (current.length >= maxWords || gap > 0.7) {
      groups.push(current);
      current = [];
    }

    current.push(word);
  }

  if (current.length) groups.push(current);

  return groups;
}

function getStyle(style: CaptionStyle) {
  if (style === "classic") {
    return {
      fontSize: 72,
      outline: 4,
      shadow: 2
    };
  }

  if (style === "bold-white") {
    return {
      fontSize: 84,
      outline: 6,
      shadow: 3
    };
  }

  return {
    fontSize: 80,
    outline: 5,
    shadow: 3
  };
}

function createLineText(
  group: WordTimestamp[],
  activeIndex: number,
  style: CaptionStyle,
  styleConfig: {
    fontSize: number;
    outline: number;
    shadow: number;
  }
) {
  return group
    .map((word, index) => {
      const clean = escapeAssText(word.word.toUpperCase());

      if (style === "classic") {
        return `{\\c&HFFFFFF&\\fs${styleConfig.fontSize}\\bord${styleConfig.outline}}${clean}`;
      }

      if (style === "bold-white") {
        const activeSize =
          index === activeIndex
            ? styleConfig.fontSize + 8
            : styleConfig.fontSize;

        return `{\\c&HFFFFFF&\\fs${activeSize}\\bord${styleConfig.outline}}${clean}`;
      }

      if (index === activeIndex) {
        return `{\\c&H00E5FF&\\fs${styleConfig.fontSize + 12}\\bord${
          styleConfig.outline + 2
        }}${clean}`;
      }

      return `{\\c&HFFFFFF&\\fs${styleConfig.fontSize}\\bord${styleConfig.outline}}${clean}`;
    })
    .join(" ");
}

export function createAssSubtitles(
  words: WordTimestamp[],
  title = "Podcast Clip",
  style: CaptionStyle = "yellow-highlight"
) {
  const groups = groupWordsIntoCaptionLines(words);
  const styleConfig = getStyle(style);
  const events: string[] = [];

  for (const group of groups) {
    if (style === "classic") {
      const start = group[0].start;
      const end = group[group.length - 1].end;
      const line = createLineText(group, -1, style, styleConfig);

      events.push(
        `Dialogue: 0,${assTime(start)},${assTime(
          end
        )},Default,,0,0,0,,${line}`
      );

      continue;
    }

    for (let activeIndex = 0; activeIndex < group.length; activeIndex++) {
      const activeWord = group[activeIndex];
      const line = createLineText(group, activeIndex, style, styleConfig);

      events.push(
        `Dialogue: 0,${assTime(activeWord.start)},${assTime(
          activeWord.end
        )},Default,,0,0,0,,${line}`
      );
    }
  }

  return `[Script Info]
Title: ${escapeAssText(title)}
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding

Style: Default,Arial,${styleConfig.fontSize},&H00FFFFFF,&H0000FFFF,&H00000000,&H99000000,-1,0,0,0,100,100,0,0,1,${styleConfig.outline},${styleConfig.shadow},2,80,80,220,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
${events.join("\n")}
`;
}