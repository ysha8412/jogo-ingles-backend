import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import axios from 'axios';

dotenv.config();
console.log('✅ API KEY carregada:', process.env.OPENAI_API_KEY);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

let usedWords = [];
const bannedWords = [
  "car", "book", "dog", "apple", "ball", "pen", "banana",
  "chair", "phone", "tree", "clock", "shoe", "sun"
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
Avoid simple or overused words (like: car, book, dog, apple, etc).
Avoid any of the following words: [${[...usedWords, ...bannedWords].map(w => `"${w}"`).join(', ')}]
Choose nouns from a diverse range of categories, such as:
- Household items, animals, weather, landscapes, food, professions, body parts, emotions, etc.
Do not repeat words.
Output must be only the list of 20 nouns, comma-separated, with no explanations or numbering.
`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/completions',
      {
        model: 'text-davinci-003',
        prompt: prompt,
        max_tokens: 200,
        temperature: 1,
        top_p: 1,
        frequency_penalty: 0.8,
        presence_penalty: 0.5,
        stop: ["\n"],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const rawText = response.data.choices[0].text;
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
    console.error('❌ ERRO AO CHAMAR A OPENAI:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Mensagem:', error.message);
    }
    res.status(500).json({ error: 'Failed to generate words' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://192.168.0.50:${PORT}`);
});
