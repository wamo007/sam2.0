import { initLlama, releaseAllLlama } from "llama.rn";
import * as FileSystem from "expo-file-system";
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as use from "@tensorflow-models/universal-sentence-encoder";
// import { useSQLiteContext } from "expo-sqlite";
import { downloadModel } from "@/configs/DownloadModel";
import { Alert } from "react-native";
import { useState, useRef, useEffect } from "react";
import { SQLiteDatabase, useSQLiteContext } from "expo-sqlite";

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
  private db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.shortTermMemory = [];
    this.encoder = null;
    this.db = db;
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

    // const db = useSQLiteContext();
    await this.db.runAsync(
      `INSERT INTO memories (content, embedding, importance) VALUES (?, ?, ?)`,
      [content, JSON.stringify(embeddingArray[0]), importance]
    );
  }

  async recall(query: string, threshold = 0.7, limit = 3): Promise<SimilarMemory[]> {
    if (!this.encoder) throw new Error("Encoder not loaded");

    const queryEmbedding = await this.encoder.embed(query);
    const queryArray = await queryEmbedding.array();

    // const db = useSQLiteContext();
    const result = await this.db.getAllAsync<Memory>(
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

// const memorySystem = new MemorySystem();

export const useLLMProcessor = () => {
  const [progress, setProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [context, setContext] = useState<any>(null);
  const [conversation, setConversation] = useState<Message[]>([
    {
      role: "system",
      content: "You are JARVIS, an advanced AI assistant. Respond with technical precision, dry wit, and impeccable British diction. Prioritize efficiency while maintaining an air of sophisticated charm.",
    },
  ]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  // const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  // const [tokensPerSecond, setTokensPerSecond] = useState<number[]>([]);
  // const scrollViewRef = useRef<any>(null);

  const db = useSQLiteContext();
  const memorySystem = useRef(new MemorySystem(db)).current;

  // const checkFileExists = async (filePath: string) => {
  //   try {
  //     const fileInfo = await FileSystem.getInfoAsync(filePath);
  //     return fileInfo.exists; 
  //   } catch (error) {
  //     console.error("Error checking file existence:", error);
  //     return false;
  //   }
  // };

  // const handleDownloadModel = async () => {
  //   // const downloadUrl = `https://huggingface.co/medmekk/Llama-3.2-1B-Instruct.GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_0.gguf`;
  //   setIsDownloading(true);
  //   setProgress(0);

  //   const destPath = `${FileSystem.documentDirectory}Llama-3.2-1B-Instruct-Q4_0.gguf`;
  //   if (await checkFileExists(destPath)) {
  //     const success = await loadModel(file);
  //     if (success) {
  //       Alert.alert(
  //         "Info",
  //         `File ${destPath} already exists, we will load it directly.`
  //       );
  //       setIsDownloading(false);
  //       return;
  //     }
  //   }
  //   try {
  //     console.log("before download");
  //     console.log(isDownloading);

  //     const destPath = await downloadModel((progress) => setProgress(progress));
  //     Alert.alert("Success", `Model downloaded to: ${destPath}`);

  //     // After downloading, load the model
  //     await loadModel(file);
  //   } catch (error) {
  //     const errorMessage =
  //       error instanceof Error ? error.message : "Unknown error";
  //     Alert.alert("Error", `Download failed: ${errorMessage}`);
  //   } finally {
  //     setIsDownloading(false);
  //   }
  // };

  // const loadModel = async (
  //   modelName: string
  // ): Promise<boolean> => {
  //   try {
  //     // Ensure models directory exists
  //     // await FileSystem.makeDirectoryAsync(
  //     //   `${FileSystem.documentDirectory}models/`,
  //     //   { intermediates: true }
  //     // );

  //     const destPath = `${FileSystem.documentDirectory}${modelName}`;
  //     const initialFileInfo = await FileSystem.getInfoAsync(destPath);
  //     // Download model if it doesn't exist
  //     if (!initialFileInfo.exists) {
  //       handleDownloadModel()
  //     }

  //     // Verify model file by reading its stats
  //     // const fileStats = await FileSystem.getInfoAsync(destPath, { size: true });
  //     // if (!fileStats.exists || !fileStats.size || fileStats.size < 1000000) { // Basic size check
  //     //   throw new Error('Downloaded model file appears corrupted');
  //     // }

  //     // Initialize model
  //     const llamaContext = await initLlama({
  //       model: destPath,
  //       use_mlock: true,
  //       n_ctx: 2048,
  //       n_gpu_layers: 1,
  //     });

  //     setContext(llamaContext);
  //     Alert.alert("Model Loaded", "The model was successfully loaded.");
  //     return true;
  //   } catch (error) {
  //     console.error("Model loading error:", error);
  //     Alert.alert(
  //       "Model Error",
  //       error instanceof Error ? 
  //         `Failed to load model: ${error.message}` : 
  //         'Unknown error occurred during model loading'
  //     );
  //     return false;
  //   }
  // };

  const loadModel = async (modelName: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const destPath = `${FileSystem.documentDirectory}${modelName}`;
      const initialFileInfo = await FileSystem.getInfoAsync(destPath);
      
      if (!initialFileInfo.exists) {
        // Show alert that download will start
        Alert.alert(
          "Model Missing", 
          "The AI model needs to be downloaded (approx. 1.5GB). This may take several minutes depending on your connection.",
          [
            {
              text: "Download Now",
              onPress: async () => {
                try {
                  setIsDownloading(true);
                  setProgress(0);
                  await downloadModel((progress) => setProgress(progress));
                  await initializeModel(destPath);
                } catch (error) {
                  console.error("Download failed:", error);
                } finally {
                  setIsDownloading(false);
                }
              }
            },
            {
              text: "Cancel",
              style: "cancel"
            }
          ]
        );
        return false;
      }
  
      return await initializeModel(destPath);
    } catch (error) {
      console.error("Model loading error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const initializeModel = async (modelPath: string): Promise<boolean> => {
    try {
      const llamaContext = await initLlama({
        model: modelPath,
        use_mlock: true,
        n_ctx: 2048,
        n_gpu_layers: 1,
      });
  
      setContext(llamaContext);
      setIsModelReady(true);
      return true;
    } catch (error) {
      console.error("Model initialization error:", error);
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
      return 'System recalibration in progress. Temporary operational impairment detected. Stand by for service restoration.';
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
    isModelReady,
    isDownloading,
    progress,

    // scrollViewRef,
    loadModel,
    processQuery,
    setUserInput,
    setConversation,
    setIsLoading,
    setIsGenerating,
  };
};

// export { memorySystem };
