import type { CoachCard, LessonStep, SoundLesson } from "@/lib/types";

function stepsFor(sound: string): LessonStep[] {
  return [
    {
      id: "explain",
      title: "Expert explanation",
      kind: "explain",
      level: 1,
      instruction: `Understand what ${sound} should feel like before you drill it.`
    },
    {
      id: "video",
      title: "Video lesson",
      kind: "video",
      level: 1,
      instruction: "Watch the coach slot when a permitted video is added, then practice the key points."
    },
    {
      id: "mouth",
      title: "Mouth position",
      kind: "mouth",
      level: 1,
      instruction: "Set your tongue, lips, airflow, and voice before saying the sound."
    },
    {
      id: "listen",
      title: "Listen and copy",
      kind: "listen",
      level: 2,
      instruction: "Listen to each model once, then repeat with control."
    },
    {
      id: "word-drill",
      title: "Word drill",
      kind: "word-drill",
      level: 2,
      instruction: "Practice short words first. Accuracy matters more than speed."
    },
    {
      id: "sentence-drill",
      title: "Sentence drill",
      kind: "sentence-drill",
      level: 3,
      instruction: "Move the sound into sentences while keeping the ending clear."
    },
    {
      id: "reading-drill",
      title: "Reading aloud",
      kind: "reading-drill",
      level: 4,
      instruction: "Read a short passage with steady pace, stress, and complete words."
    },
    {
      id: "record",
      title: "Record and submit",
      kind: "record",
      level: 5,
      instruction: "Record one selected drill and submit it for structured feedback."
    },
    {
      id: "feedback",
      title: "Feedback and retry",
      kind: "feedback",
      level: 5,
      instruction: "Review the score, sound notes, mouth tip, retry text, and next recommendation."
    },
    {
      id: "complete",
      title: "Save and continue",
      kind: "complete",
      level: 5,
      instruction: "Save the result and unlock the next useful lesson."
    }
  ];
}

function placeholderVideo(title: string) {
  return {
    title: `${title}: Expert video coming soon`,
    coachName: "KoloSpeak Coach",
    videoUrl: "",
    thumbnail: "",
    transcript:
      "Use a short owned, Creative Commons, public-domain, or permitted embed video. If none is available, the coach card teaches the mouth position.",
    keyPoints: [
      "Watch the mouth shape.",
      "Listen once before speaking.",
      "Practice immediately after the clip."
    ],
    source: "",
    license: "unknown" as const,
    attribution: ""
  };
}

const cards: Record<string, CoachCard> = {
  th: {
    tongue: "Tip of the tongue rests lightly between the teeth.",
    lips: "Lips stay relaxed and open.",
    airflow: "Air passes in a thin stream between tongue and teeth.",
    voice: "Use no vibration for think, and vibration for this.",
    mistakeToAvoid: "Do not turn TH into T, D, S, or Z.",
    practiceExample: "think, this, thank you",
    diagram: "airflow-between-teeth"
  },
  rl: {
    tongue: "For L, touch behind the top teeth. For R, pull the tongue back without touching.",
    lips: "Keep lips relaxed for L; round slightly for strong R.",
    airflow: "Air should move freely without a hard stop.",
    voice: "Both sounds use voice vibration.",
    mistakeToAvoid: "Do not let R and L collapse into the same middle sound.",
    practiceExample: "right light, road load",
    diagram: "tongue-behind-teeth"
  },
  vb: {
    tongue: "Tongue stays relaxed behind the lower teeth.",
    lips: "For V, top teeth lightly touch bottom lip. For B, both lips close and release.",
    airflow: "V has steady air; B has a short burst.",
    voice: "Both sounds vibrate, but V holds the vibration longer.",
    mistakeToAvoid: "Do not close both lips for V.",
    practiceExample: "very berry, vendor better",
    diagram: "teeth-touch-lip"
  },
  vowel: {
    tongue: "Keep the tongue relaxed for short I and higher for long E.",
    lips: "Short I is relaxed; long E uses a small smile.",
    airflow: "Keep airflow smooth, not forced.",
    voice: "Both are voiced vowel sounds.",
    mistakeToAvoid: "Do not make sit and seat the same length.",
    practiceExample: "sit seat, ship sheep",
    diagram: "lips-relaxed"
  },
  final: {
    tongue: "Move to the final consonant position before stopping.",
    lips: "Release final lip sounds like P, B, M, F, and V cleanly.",
    airflow: "Give the ending a small release without adding an extra vowel.",
    voice: "Keep voiced endings vibrating until the word is complete.",
    mistakeToAvoid: "Do not drop worked, asked, helped, or final S sounds.",
    practiceExample: "worked late, asked first, helped them",
    diagram: "final-release"
  },
  rhythm: {
    tongue: "Keep articulation light so stressed words can stand out.",
    lips: "Stay relaxed; do not rush small words into unclear speech.",
    airflow: "Use short pauses to reset breath and pace.",
    voice: "Make important words longer and stronger.",
    mistakeToAvoid: "Do not run every word together at one speed.",
    practiceExample: "Please send the message on time.",
    diagram: "lips-rounded"
  }
};

export const lessons: SoundLesson[] = [
  {
    id: "th-think",
    name: "TH as in think",
    targetSound: "unvoiced TH",
    level: 1,
    instruction:
      "Place the tip of your tongue lightly between your teeth. Let air pass out softly. Do not bite hard.",
    commonMistake: "Saying tink, sink, or tank instead of think and thank.",
    correctSoundExample: "think, thank, three",
    steps: stepsFor("unvoiced TH"),
    video: placeholderVideo("TH as in think"),
    coachCard: cards.th,
    words: ["think", "thank", "three", "bath", "north"],
    sentences: [
      "I think the meeting starts at three.",
      "Thank you for helping me today.",
      "The north door is open."
    ],
    passage:
      "Thank you for meeting with me today. I think we can finish the work by three if we stay focused.",
    conversationPrompt: "Explain a work problem using think, three, and thank you."
  },
  {
    id: "th-this",
    name: "TH as in this",
    targetSound: "voiced TH",
    level: 1,
    unlockAfter: ["th-think"],
    instruction:
      "Put your tongue lightly between your teeth and turn your voice on. Feel a small vibration.",
    commonMistake: "Saying dis, dat, dose, or moder instead of this, that, those, and mother.",
    correctSoundExample: "this, that, those",
    steps: stepsFor("voiced TH"),
    video: placeholderVideo("TH as in this"),
    coachCard: cards.th,
    words: ["this", "that", "those", "mother", "breathe"],
    sentences: [
      "This is the form for the appointment.",
      "Those items are ready for delivery.",
      "My mother will call this afternoon."
    ],
    passage:
      "This message is for the office. Those papers are ready, and the driver will bring them this afternoon.",
    conversationPrompt: "Tell a customer that those documents are ready this afternoon."
  },
  {
    id: "r-l-clarity",
    name: "R and L clarity",
    targetSound: "R and L",
    level: 2,
    instruction:
      "For L, touch your tongue behind your top teeth. For R, pull your tongue back and keep it from touching the roof.",
    commonMistake: "Letting right/light and road/load sound too similar.",
    correctSoundExample: "right, light, road, load",
    steps: stepsFor("R and L"),
    video: placeholderVideo("R and L clarity"),
    coachCard: cards.rl,
    words: ["right", "light", "road", "load", "correct"],
    sentences: [
      "Please write the correct room number.",
      "The light is on near the road.",
      "I will call when the order is ready."
    ],
    passage:
      "Please write the correct address on the order. I will call the customer when the delivery is ready.",
    conversationPrompt: "Give clear directions using right, light, road, and call."
  },
  {
    id: "short-i-long-e",
    name: "Short I and Long E control",
    targetSound: "short I and long E",
    level: 2,
    instruction:
      "Keep short I quick and relaxed. Hold long E longer with a small smile so sit and seat do not merge.",
    commonMistake: "Making ship and sheep, sit and seat, or live and leave sound the same.",
    correctSoundExample: "sit, seat, ship, sheep",
    steps: stepsFor("short I and long E"),
    video: placeholderVideo("Short I and Long E"),
    coachCard: cards.vowel,
    words: ["sit", "seat", "ship", "sheep", "business", "meeting"],
    sentences: [
      "Please sit in the waiting area.",
      "I need a seat for the meeting.",
      "The business meeting is simple."
    ],
    passage:
      "Please sit here and review the list. I need to speak with the manager after the meeting.",
    conversationPrompt: "Explain a business meeting using sit, seat, need, and speak."
  },
  {
    id: "v-b",
    name: "V and B difference",
    targetSound: "V and B",
    level: 2,
    instruction:
      "For V, touch your top teeth to your bottom lip and let the voice buzz. For B, close both lips and release.",
    commonMistake: "Closing both lips for very, vendor, verify, or invoice.",
    correctSoundExample: "very, berry, vendor, better",
    steps: stepsFor("V and B"),
    video: placeholderVideo("V and B difference"),
    coachCard: cards.vb,
    words: ["very", "berry", "vendor", "better", "invoice", "verify"],
    sentences: [
      "The vendor sent a very clear invoice.",
      "This box is better for delivery.",
      "Please verify the business number."
    ],
    passage:
      "The vendor called about the invoice. Please verify the number before the box is sent for delivery.",
    conversationPrompt: "Call a vendor and verify an invoice number."
  },
  {
    id: "final-consonants",
    name: "Final consonants",
    targetSound: "word endings",
    level: 3,
    instruction:
      "Give the last sound a gentle finish. Do not add a full extra syllable unless the word needs it.",
    commonMistake: "Dropping the last sound in worked, asked, helped, called, or finished.",
    correctSoundExample: "worked, asked, helped",
    steps: stepsFor("final consonants"),
    video: placeholderVideo("Final consonants"),
    coachCard: cards.final,
    words: ["worked", "asked", "helped", "called", "finished", "next"],
    sentences: [
      "I worked late and finished the report.",
      "She asked for help with the form.",
      "We called the customer and helped him."
    ],
    passage:
      "I worked on the message, asked one question, and finished the report before the office closed.",
    conversationPrompt: "Give a 30-second update about what you finished, checked, and sent."
  },
  {
    id: "consonant-clusters",
    name: "Consonant clusters",
    targetSound: "clusters and blends",
    level: 3,
    unlockAfter: ["final-consonants"],
    instruction:
      "Keep each consonant in a cluster light but present. Do not skip the middle or final sound.",
    commonMistake: "Turning first, next, asked, or texts into shorter unclear words.",
    correctSoundExample: "first, next, asked, texts",
    steps: stepsFor("consonant clusters"),
    video: placeholderVideo("Consonant clusters"),
    coachCard: cards.final,
    words: ["first", "next", "texts", "asked", "costs", "helped"],
    sentences: [
      "First, send the next text.",
      "The customer asked for the exact costs.",
      "I helped with the last request."
    ],
    passage:
      "First, I checked the next request. The customer asked for exact costs, and I sent the last text.",
    conversationPrompt: "Explain the first, next, and last steps in a service call."
  },
  {
    id: "word-stress",
    name: "Word stress",
    targetSound: "word stress",
    level: 4,
    instruction:
      "Make the strong syllable longer and clearer. Keep the other syllables softer.",
    commonMistake: "Giving every syllable the same weight in appointment, delivery, and important.",
    correctSoundExample: "apPOINTment, deLIvery, imPORTant",
    steps: stepsFor("word stress"),
    video: placeholderVideo("Word stress"),
    coachCard: cards.rhythm,
    words: ["today", "customer", "appointment", "delivery", "important"],
    sentences: [
      "The appointment is important today.",
      "The customer needs a delivery update.",
      "Please confirm the important details."
    ],
    passage:
      "The customer has an important appointment today. Please confirm the delivery time and the correct address.",
    conversationPrompt: "Leave a voicemail about an important appointment and delivery update."
  },
  {
    id: "sentence-rhythm",
    name: "Sentence rhythm and pauses",
    targetSound: "sentence rhythm",
    level: 4,
    instruction:
      "Stress the important words. Use small pauses so clear speech does not turn into rushed speech.",
    commonMistake: "Running small words and important words together until the message blurs.",
    correctSoundExample: "I need to finish this / at work today.",
    steps: stepsFor("sentence rhythm"),
    video: placeholderVideo("Sentence rhythm"),
    coachCard: cards.rhythm,
    words: ["I need to", "can you", "at work", "on time", "call me"],
    sentences: [
      "I need to finish this at work.",
      "Can you call me when you arrive?",
      "Please send the message on time."
    ],
    passage:
      "I need to finish this at work today. Please call me when you arrive, and send the message on time.",
    conversationPrompt: "Ask someone to call you when they arrive and send the message on time."
  },
  {
    id: "conversation-transfer",
    name: "Real conversation transfer",
    targetSound: "natural speaking clarity",
    level: 5,
    unlockAfter: ["sentence-rhythm"],
    instruction:
      "Use pauses, complete endings, and clear stress while answering realistic pressure prompts.",
    commonMistake: "Speaking clearly in drills but blending words under pressure.",
    correctSoundExample: "Pause, finish, then continue.",
    steps: stepsFor("real conversation clarity"),
    video: placeholderVideo("Real conversation transfer"),
    coachCard: cards.rhythm,
    words: ["pause", "finish", "explain", "confirm", "repeat"],
    sentences: [
      "Let me explain that clearly.",
      "I will confirm the details and call you back.",
      "Please repeat the number so I can write it correctly."
    ],
    passage:
      "When the conversation gets fast, I can pause, finish my words, and explain the main point clearly.",
    conversationPrompt: "A client is confused about a bill. Explain the issue in 30 seconds with calm pauses."
  }
];

export const readingTopics = [
  {
    id: "intro",
    title: "Introducing yourself",
    text: "Good morning. My name is Leon. I am happy to meet you. I work hard, I ask questions, and I like to speak clearly."
  },
  {
    id: "customer",
    title: "Talking to a customer",
    text: "Thank you for calling. I can help you with that order. Please give me your name, phone number, and delivery address."
  },
  {
    id: "vendor",
    title: "Calling a vendor",
    text: "Hello, this is Leon calling about an invoice. Please confirm the total and send the updated receipt by email."
  },
  {
    id: "work",
    title: "Speaking at work",
    text: "I finished the first task and started the next one. I will update the team before the end of the day."
  },
  {
    id: "business",
    title: "Business message",
    text: "Please review the appointment schedule. The customer requested a morning visit and a confirmation call."
  },
  {
    id: "bible-kjv",
    title: "Bible mode: Psalm 23:1 KJV",
    text: "The LORD is my shepherd; I shall not want."
  }
];
