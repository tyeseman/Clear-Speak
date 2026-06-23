import type { SoundLesson } from "@/lib/types";

export const lessons: SoundLesson[] = [
  {
    id: "th-think",
    name: "TH as in think",
    targetSound: "unvoiced th",
    instruction:
      "Place the tip of your tongue lightly between your teeth. Let air pass out softly. Do not bite hard.",
    words: ["think", "thank", "three", "bath", "north"],
    sentences: [
      "I think the meeting starts at three.",
      "Thank you for helping me today.",
      "The north door is open."
    ],
    passage:
      "Thank you for meeting with me today. I think we can finish the work by three if we stay focused."
  },
  {
    id: "th-this",
    name: "TH as in this",
    targetSound: "voiced th",
    instruction:
      "Put your tongue lightly between your teeth and turn your voice on. Feel a small vibration.",
    words: ["this", "that", "those", "mother", "breathe"],
    sentences: [
      "This is the form for the appointment.",
      "Those items are ready for delivery.",
      "My mother will call this afternoon."
    ],
    passage:
      "This message is for the office. Those papers are ready, and the driver will bring them this afternoon."
  },
  {
    id: "r-l-clarity",
    name: "R and L clarity",
    targetSound: "r and l",
    instruction:
      "For L, touch your tongue behind your top teeth. For R, pull your tongue back and keep it from touching the roof.",
    words: ["right", "light", "road", "load", "correct"],
    sentences: [
      "Please write the correct room number.",
      "The light is on near the road.",
      "I will call when the order is ready."
    ],
    passage:
      "Please write the correct address on the order. I will call the customer when the delivery is ready."
  },
  {
    id: "short-i",
    name: "Short I as in sit",
    targetSound: "short i",
    instruction:
      "Keep your mouth relaxed and short. The sound is quick, like sit, list, and finish.",
    words: ["sit", "ship", "list", "finish", "business"],
    sentences: [
      "Please sit in the waiting area.",
      "I will finish the list before six.",
      "The business meeting is simple."
    ],
    passage:
      "Please sit here and review the list. I will finish the business message before the meeting starts."
  },
  {
    id: "long-e",
    name: "Long E as in seat",
    targetSound: "long e",
    instruction:
      "Smile slightly and hold the sound longer. Keep it clear, like seat, need, and speak.",
    words: ["seat", "need", "speak", "meeting", "receipt"],
    sentences: [
      "I need a seat for the meeting.",
      "Please speak clearly on the phone.",
      "The receipt is in the email."
    ],
    passage:
      "I need to speak with the manager after the meeting. The receipt is in the email from yesterday."
  },
  {
    id: "v-b",
    name: "V and B difference",
    targetSound: "v and b",
    instruction:
      "For V, touch your top teeth to your bottom lip and let the voice buzz. For B, close both lips and release.",
    words: ["very", "berry", "vendor", "better", "invoice"],
    sentences: [
      "The vendor sent a very clear invoice.",
      "This box is better for delivery.",
      "Please verify the business number."
    ],
    passage:
      "The vendor called about the invoice. Please verify the number before the box is sent for delivery."
  },
  {
    id: "final-consonants",
    name: "Final consonants",
    targetSound: "word endings",
    instruction:
      "Give the last sound a gentle finish. Do not add a full extra syllable unless the word needs it.",
    words: ["worked", "asked", "helped", "called", "finished"],
    sentences: [
      "I worked late and finished the report.",
      "She asked for help with the form.",
      "We called the customer and helped him."
    ],
    passage:
      "I worked on the message, asked one question, and finished the report before the office closed."
  },
  {
    id: "word-stress",
    name: "Word stress",
    targetSound: "word stress",
    instruction:
      "Make the strong syllable longer and clearer. Keep the other syllables softer.",
    words: ["today", "customer", "appointment", "delivery", "important"],
    sentences: [
      "The appointment is important today.",
      "The customer needs a delivery update.",
      "Please confirm the important details."
    ],
    passage:
      "The customer has an important appointment today. Please confirm the delivery time and the correct address."
  },
  {
    id: "sentence-rhythm",
    name: "Sentence rhythm",
    targetSound: "sentence rhythm",
    instruction:
      "Stress the important words. Let small words connect naturally so the sentence sounds smooth.",
    words: ["I need to", "can you", "at work", "on time", "call me"],
    sentences: [
      "I need to finish this at work.",
      "Can you call me when you arrive?",
      "Please send the message on time."
    ],
    passage:
      "I need to finish this at work today. Please call me when you arrive, and send the message on time."
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
