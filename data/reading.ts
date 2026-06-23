export const readingTopicsList = [
  "business",
  "faith and Bible",
  "Liberian community",
  "family",
  "personal growth",
  "public speaking",
  "technology",
  "customer service",
  "leadership",
  "history",
  "short stories",
  "practical U.S. life"
];

export const readingLevels = ["very easy", "easy", "medium", "challenging"] as const;
export const readingLengths = [1, 3, 5, 10] as const;

export const habitPassages: Record<string, string> = {
  business:
    "A good business call starts with a clear greeting. Give your name, explain the reason for the call, and repeat the important details before you finish.",
  "faith and Bible":
    "The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters.",
  "Liberian community":
    "Community grows when people listen well, speak with respect, and help one another. A clear voice can carry kindness, strength, and pride.",
  family:
    "Family conversations can be simple and warm. Speak slowly, finish each word, and give people time to understand what matters to you.",
  "personal growth":
    "Small practice can change a day. One clear sentence today can become a stronger voice tomorrow.",
  "public speaking":
    "Before speaking to a group, breathe once, stand steady, and say the first sentence slowly. Let the important words land.",
  technology:
    "Technology helps people work faster, but clear communication still matters. Explain the problem, the steps, and the result.",
  "customer service":
    "Thank you for calling. I can help you today. Please give me your name, phone number, and the best time to reach you.",
  leadership:
    "A good leader speaks with clarity and listens with patience. Clear words help the team know what to do next.",
  history:
    "History tells the story of people, places, choices, and change. Reading history can help us understand today.",
  "short stories":
    "The shop opened early, and the first customer smiled at the door. She needed one small item and a kind word.",
  "practical U.S. life":
    "Please arrive ten minutes before your appointment. Bring your photo ID, insurance card, and any forms you completed."
};

export function passageForTopic(topic: string, customTopic: string) {
  if (customTopic.trim()) {
    return `Today I am reading about ${customTopic.trim()}. I will speak slowly, finish each word, and explain the main idea in my own words.`;
  }
  return habitPassages[topic] ?? habitPassages["practical U.S. life"];
}
