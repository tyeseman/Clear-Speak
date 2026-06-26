import type { WordBank, WordBankItem } from "@/lib/types";

const starterItems: Array<Omit<WordBankItem, "status" | "attempts" | "bestScore">> = [
  ["think", "unvoiced TH", "easy", "Place tongue lightly between teeth.", "I think the meeting starts now.", "Do not say tink.", "TH as in think", "Baseline TH practice."],
  ["three", "unvoiced TH", "easy", "Let air pass between tongue and teeth.", "Three people are waiting.", "Do not say tree.", "TH as in think", "Common TH clarity word."],
  ["this", "voiced TH", "easy", "Turn your voice on with tongue between teeth.", "This is the correct form.", "Do not say dis.", "TH as in this", "Voiced TH practice."],
  ["mother", "voiced TH", "medium", "Keep the middle TH voiced and gentle.", "My mother will call today.", "Do not say moder.", "TH as in this", "Middle-word TH practice."],
  ["right", "R and L", "easy", "Pull the tongue back for R.", "Turn right at the light.", "Do not make it sound like light.", "R and L", "R/L contrast."],
  ["light", "R and L", "easy", "Touch behind top teeth for L.", "The light is near the road.", "Do not make it sound like right.", "R and L", "R/L contrast."],
  ["very", "V and B", "easy", "Top teeth lightly touch bottom lip.", "The vendor was very helpful.", "Do not close both lips.", "V and B", "V/B contrast."],
  ["better", "V and B", "easy", "Close both lips for B and release.", "This option is better.", "Do not make B buzz like V.", "V and B", "V/B contrast."],
  ["sit", "short I and long E", "easy", "Keep short I relaxed and quick.", "Please sit here.", "Do not stretch it like seat.", "short I", "Vowel clarity."],
  ["seat", "short I and long E", "easy", "Smile slightly and hold long E.", "I need a seat.", "Do not shorten it like sit.", "long E", "Vowel clarity."],
  ["worked", "final consonants", "medium", "Finish the final T sound gently.", "I worked late yesterday.", "Do not drop the ending.", "final T D K S", "Dropped ending review."],
  ["asked", "consonant clusters", "medium", "Keep S and K light but present.", "She asked for help.", "Do not skip the K sound.", "clusters", "Cluster and final sound practice."],
  ["costs", "consonant clusters", "hard", "Finish S-T-S clearly.", "Please confirm the costs.", "Do not say cost only.", "clusters", "Harder cluster practice."],
  ["appointment", "word stress", "medium", "Stress the POINT syllable.", "The appointment is today.", "Do not stress every syllable equally.", "word stress", "Stress control."],
  ["delivery", "word stress", "medium", "Stress the LIV syllable.", "The delivery arrives today.", "Do not flatten the word.", "word stress", "Professional speech word."]
].map(([word, targetSound, difficulty, mouthTip, exampleSentence, commonMistake, soundCategory, reasonSelected]) => ({
  word,
  targetSound,
  difficulty: difficulty as "easy" | "medium" | "hard",
  mouthTip,
  exampleSentence,
  commonMistake,
  soundCategory,
  reasonSelected
}));

export function fallbackWordBank(focusArea = "pronunciation clarity", batchSize: 25 | 50 | 100 = 25): WordBank {
  const repeated = Array.from({ length: Math.ceil(batchSize / starterItems.length) }, () => starterItems).flat();
  return {
    focusArea,
    soundCategory: focusArea,
    batchSize,
    sourceReason: "Local starter set used when AI word-bank generation is unavailable.",
    items: repeated.slice(0, batchSize).map((item) => ({
      ...item,
      status: "new",
      attempts: 0,
      bestScore: 0
    }))
  };
}
