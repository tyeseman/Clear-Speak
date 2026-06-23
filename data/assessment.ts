export const baselineAssessment = {
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
    "customer",
    "appointment",
    "important",
    "delivery"
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
  checks: [
    "Speaking speed",
    "Final consonants",
    "TH sound",
    "R and L clarity",
    "V and B clarity",
    "Short I and long E clarity",
    "Word stress",
    "Sentence rhythm"
  ]
};

export function baselineExpectedText() {
  return [
    ...baselineAssessment.words,
    ...baselineAssessment.sentences,
    baselineAssessment.passage
  ].join(" ");
}
