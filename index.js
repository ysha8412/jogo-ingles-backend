const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const axios = require('axios');

dotenv.config();
if (!process.env.OPENAI_API_KEY) {
  console.log('❌ A chave da OpenAI NÃO foi carregada!');
} else {
  console.log('✅ API KEY carregada com sucesso!');
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

let usedWords = [];
const bannedWords = [
  "car", "book", "dog", "apple"
];

// Rota para resetar palavras usadas (opcional)
app.post('/reset-used-words', (req, res) => {
  usedWords = [];
  console.log("🔄 Lista de palavras usadas foi resetada.");
  res.json({ message: 'Lista de palavras usadas foi limpa.' });
});

// Rota principal
app.post('/get-words', async (req, res) => {
  const { level } = req.body;

  if (!level) {
    return res.status(400).json({ error: 'Level is required' });
  }

  const prompt = `
Generate exactly 20 unique English nouns appropriate for ${level} level learners.

- Avoid repeating nouns used in previous lists.
- Do not include overused or overly obvious words (like "car", "book", "dog" for Beginner).
- Do not include any of the following words: [${[...usedWords, ...bannedWords].map(w => `"${w}"`).join(", ")}]

- Ensure all nouns are appropriate to the chosen difficulty level:
  - Beginner = common, concrete nouns, used daily.
  - Intermediate = slightly less common nouns that may be specific but still familiar to intermediate learners.
  - Advanced = less commonly used nouns.

- Select nouns from a variety of the following categories:

  🏠 Daily Life
  - Household items, Rooms in the house, Furniture, Kitchen utensils, Electronic devices, Hygiene products,
  - Food, Drinks, Meals, Means of transport, Shopping / supermarket, Clothing items, Types of footwear, Accessories

  🧍 Human Being
  - Body parts, Feelings and emotions, Skills and abilities, Professions, Family relationships, Stages of life

  🌳 Environment and Nature
  - Domestic animals, Wild animals, Aquatic animals, Animals in general, Plants and flowers, Trees,
  - Weather phenomena, Landscape elements (mountains, rivers, etc.), Seasons of the year

  🏫 Education and Work
  - School supplies, School subjects, University majors, Professions, Work tools, Workplaces,
  - Office equipment, Technology / IT, Objects at school, Office items

  🏙️ Cities and Locations
  - Types of buildings, Public places, Institutions and social structures, Commercial establishments,
  - Tourist attractions, Public transport, Events

  🎉 Leisure
  - Sports, Musical instruments, Hobbies

  ✈️ Transport and Travel
  - Land transport, Air transport, Water transport, Travel-related items, Types of accommodation

  🧠 Abstract Concepts
  - Human qualities (e.g., honesty, courage), Social concepts (e.g., justice, freedom), Academic terms,
  - Values and virtues, Mental states

  ⏳ Time
  - Days of the week, Months, Seasons, Units of time (hour, minute, year)

  ⚖️ Government and Systems
  - Public institutions, Political systems, Economic concepts, Government professions

- Do not repeat any noun that has already been used by other teams.
- Do not repeat categories within the same list.

Output must be only the list of 20 nouns, comma-separated, with no explanations or numbering.
`;


  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const rawText = response.data.choices[0].message.content;
    console.log('🧠 Resposta bruta da OpenAI:\n', rawText);

    const newWords = rawText
      .split(',')
      .map(w => w.trim().toLowerCase())
      .filter(w => w && !usedWords.includes(w) && !bannedWords.includes(w));

    usedWords = [...usedWords, ...newWords];

    console.log(`📦 Lista gerada com ${newWords.length} palavras.`);
    console.log(`📊 Total de palavras únicas até agora: ${usedWords.length}`);

    if (newWords.length < 10) {
      console.warn("⚠️ Poucas palavras válidas geradas. Tente novamente.");
      return res.status(202).json({
        warning: "Poucas palavras válidas. Refaça a requisição.",
        words: newWords,
      });
    }

    res.json({ words: newWords });
  } catch (error) {
    if (error.response) {
      console.error('📛 Status:', error.response.status);
      console.error('📩 Data:', JSON.stringify(error.response.data));
    } else {
      console.error('🧨 Erro genérico:', error.message);
    }
    res.status(500).json({ error: 'Failed to generate words' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
});
