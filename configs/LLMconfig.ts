import { initLlama, releaseAllLlama } from "llama.rn";
import * as FileSystem from "expo-file-system";
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as use from "@tensorflow-models/universal-sentence-encoder";
import { useSQLiteContext } from "expo-sqlite";
import { Alert } from "react-native";
import { useState, useRef } from "react";

interface Memory {
  id: number;
  content: string;
  embedding: string;
  importance: number;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  thought?: string;
  showThought?: boolean;
}

interface SimilarMemory extends Memory {
  similarity: number;
}

class MemorySystem {
  private shortTermMemory: Array<{role: string, content: string}>;
  private encoder: use.UniversalSentenceEncoder | null;

  constructor() {
    this.shortTermMemory = [];
    this.encoder = null;
    this.loadEncoder();
  }

  private async loadEncoder(): Promise<void> {
    await tf.ready();
    this.encoder = await use.load();
  }

  async remember(content: string, importance = 0.5): Promise<void> {
    if (!this.encoder) throw new Error("Encoder not loaded");
    
    const embedding = await this.encoder.embed(content);
    const embeddingArray = await embedding.array();

    const db = useSQLiteContext();
    await db.runAsync(
      `INSERT INTO memories (content, embedding, importance) VALUES (?, ?, ?)`,
      [content, JSON.stringify(embeddingArray[0]), importance]
    );
  }

  async recall(query: string, threshold = 0.7, limit = 3): Promise<SimilarMemory[]> {
    if (!this.encoder) throw new Error("Encoder not loaded");

    const queryEmbedding = await this.encoder.embed(query);
    const queryArray = await queryEmbedding.array();

    const db = useSQLiteContext();
    const result = await db.getAllAsync<Memory>(
      `SELECT id, content, embedding FROM memories`
    );

    const relevantMemories = await Promise.all(
      result.map(async (memory) => {
        const storedEmbedding = JSON.parse(memory.embedding);
        const similarity = await this.cosineSimilarity(queryArray[0], storedEmbedding);
        return {
          ...memory,
          similarity
        } as SimilarMemory;
      })
    );

    return relevantMemories
      .filter(memory => memory.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private async cosineSimilarity(a: number[], b: number[]): Promise<number> {
    const dotProduct = a.reduce((sum: number, val: number, i: number) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum: number, val: number) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum: number, val: number) => sum + val * val, 0));
    return dotProduct / (normA * normB);
  }

  addToShortTerm(userInput: string, assistantResponse: string): void {
    this.shortTermMemory.push(
      { role: "user", content: userInput },
      { role: "assistant", content: assistantResponse }
    );

    if (this.shortTermMemory.length > 6) {
      this.shortTermMemory = this.shortTermMemory.slice(-6);
    }
  }

  getShortTermContext(): string {
    return this.shortTermMemory.map(msg => `${msg.role}: ${msg.content}`).join("\n");
  }
}

const memorySystem = new MemorySystem();

export const useLLMProcessor = () => {
  const [context, setContext] = useState<any>(null);
  const [conversation, setConversation] = useState<Message[]>([
    {
      role: "system",
      content: "This is a conversation between user and assistant, a friendly chatbot.",
    },
  ]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [tokensPerSecond, setTokensPerSecond] = useState<number[]>([]);
  const scrollViewRef = useRef<any>(null);

  const loadModel = async (modelName: string): Promise<boolean> => {
    try {
      const destPath = `${FileSystem.documentDirectory}models/${modelName}`;
      const llamaContext = await initLlama({
        model: destPath,
        use_mlock: true,
        n_ctx: 2048,
        n_gpu_layers: 1,
      });
      setContext(llamaContext);
      Alert.alert("Model Loaded", "The model was successfully loaded.");
      return true;
    } catch (error) {
      console.error("Error loading model:", error);
      Alert.alert("Error Loading Model", error instanceof Error ? error.message : "Unknown error");
      return false;
    }
  };

  const processQuery = async (query: string, isOnline = false): Promise<string> => {
    if (!context) {
      Alert.alert("Model Not Loaded", "Please load the model first.");
      return "";
    }

    try {
      const memories = await memorySystem.recall(query);
      const memoryContext = memories.length > 0 
        ? `Relevant memories:\n${memories.map(m => m.content).join('\n')}`
        : '';
      const shortTermContext = memorySystem.getShortTermContext();

      const prompt = `
        [INST] 
        Current conversation context:
        ${shortTermContext || "No recent context"}
        
        ${memoryContext}

        User query: ${query}
        
        Respond in a formal yet witty manner, often incorporating dry humor into your responses. 
        If remembering from past conversations, do so in a way that is relevant to the current context.
        [/INST]
      `;

      const response = await context.completion({
        prompt,
        n_predict: 200,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.5,
        presence_penalty: 0.5,
      });

      memorySystem.addToShortTerm(query, response);
      if (shouldRemember(query, response)) {
        await memorySystem.remember(`${query} ${response}`, calculateImportance(query));
      }

      return response;
    } catch (err) {
      console.error("LLM processing error:", err);
      return 'I am unable to process your request at the moment. Please try again later.';
    }
  };

  const shouldRemember = (query: string, response: string): boolean => {
    return query.toLowerCase().includes("remember") ||
      response.includes('important') ||
      (query.includes('?') && response.length > 50);
  };

  const calculateImportance = (query: string): number => {
    if (query.includes('!')) return 0.8;
    if (query.includes('?')) return 0.7;
    if (query.includes('remember')) return 0.9;
    return 0.5;
  };

  return {
    context,
    conversation,
    userInput,
    isLoading,
    isGenerating,
    tokensPerSecond,
    scrollViewRef,
    loadModel,
    processQuery,
    setUserInput,
    setConversation,
    setIsLoading,
    setIsGenerating,
    setAutoScrollEnabled
  };
};

export { memorySystem };
