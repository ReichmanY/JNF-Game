export const POSITIVE_LINES = [
  "Nailed it! Were you a tour guide in your past life?",
  "Spot on! Looks like you've got an Israel GPS built in.",
  "Wow, are you sure you didn't grow up in Green Horizons?",
  "Bullseye! Someone's been paying attention on those trips.",
  "Right on the money! JNF-USA would be proud.",
  "Impressive! You clearly know your way around Israel.",
  "Correct! Okay, now you're just showing off.",
  "You really do love Israel, and it shows. Keep going!",
];

export const NEGATIVE_LINES = [
  "Close, but not quite! Time to book a flight and join a JNF-USA tour in Israel.",
  "Oops! A JNF-USA trip could fix that in no time.",
  "Not this time! Israel is waiting for you to explore it.",
  "Almost! A weekend with Green Horizons would sharpen that map skill.",
  "Missed it, but don't worry, even locals get lost sometimes.",
  "Not quite! Join a Green Horizon committee and you'll know every corner.",
  "Nice try! Pack your bags and come see it for yourself.",
];

export function emptyCheerState() {
  return { positive: 0, negative: 0, usedPositive: [], usedNegative: [] };
}

function takeRandom(lines, used) {
  const unused = lines.filter((line) => !used.includes(line));
  const pool = unused.length ? unused : lines;
  const text = pool[Math.floor(Math.random() * pool.length)];
  used.push(text);
  return text;
}

export function pickQuestionCheer(score, cheer) {
  if (score > 3000 && cheer.positive < 2) {
    cheer.positive += 1;
    return { kind: "up", text: takeRandom(POSITIVE_LINES, cheer.usedPositive) };
  }
  if (score < 2000 && cheer.negative < 1) {
    cheer.negative += 1;
    return { kind: "down", text: takeRandom(NEGATIVE_LINES, cheer.usedNegative) };
  }
  return null;
}
