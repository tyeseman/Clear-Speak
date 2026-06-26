export const baselineAssessment = {
  profileQuestions: [
    {
      id: "reasonForJoining",
      label: "Why are you here?",
      placeholder: "Example: I want people to understand me clearly at work."
    },
    {
      id: "improvementGoal",
      label: "What do you want to improve?",
      placeholder: "Example: pronunciation, confidence, reading aloud, customer calls."
    },
    {
      id: "difficultSituations",
      label: "What situations make speaking difficult?",
      placeholder: "Example: phone calls, meetings, explaining business details."
    }
  ],
  words: [
    "think",
    "this",
    "three",
    "mother",
    "right",
    "light",
    "very",
    "better",
    "sit",
    "seat",
    "ship",
    "sheep",
    "worked",
    "asked",
    "helped",
    "finished",
    "first",
    "next",
    "texts",
    "costs",
    "customer",
    "appointment",
    "important",
    "delivery",
    "clearly"
  ],
  sentences: [
    "I think the meeting starts at three.",
    "This is the form for the appointment.",
    "Please write the correct room number.",
    "The light is on near the road.",
    "The vendor sent a very clear invoice.",
    "Please sit in the waiting area.",
    "I need a seat for the meeting.",
    "I worked late and finished the report.",
    "The appointment is important today.",
    "Please send the message on time."
  ],
  passage:
    "Good morning. My name is Leon. I am calling about an important appointment today. Please confirm the delivery time, the correct address, and the customer phone number. Thank you for helping me speak clearly and confidently.",
  freeSpeakingPrompt:
    "In your own words, explain what kind of speaking situations feel hardest for you and what you want to improve first.",
  checks: [
    "Vowel clarity",
    "Consonant clarity",
    "Speaking speed",
    "Final consonants",
    "Consonant clusters",
    "TH sound",
    "R and L clarity",
    "V and B clarity",
    "Short I and long E clarity",
    "Word stress",
    "Sentence rhythm",
    "Dropped endings",
    "Skipped words",
    "Blended words",
    "Reading fluency",
    "Natural speaking clarity"
  ]
};

export function baselineExpectedText() {
  return [
    ...baselineAssessment.words,
    ...baselineAssessment.sentences,
    baselineAssessment.passage,
    baselineAssessment.freeSpeakingPrompt
  ].join(" ");
}
