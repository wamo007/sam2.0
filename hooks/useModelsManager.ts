import { initLlama, releaseAllLlama } from "llama.rn";
import * as FileSystem from "expo-file-system";
import { downloadModel } from "@/configs/DownloadModel";
import { Alert, Platform } from "react-native";
import { useState } from "react";
import { downloadTTSModel } from "@/configs/DownloadTTSModel";
import TTSManager from 'my-package-wamo';
import { downloadSTTModel } from "@/configs/DownloadSTTModel";

export const useModelsManager = () => {

  const [progress, setProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isTTSDownloading, setIsTTSDownloading] = useState<boolean>(false);
  const [isSTTDownloading, setIsSTTDownloading] = useState<boolean>(false);
  const [context, setContext] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isModelReady, setIsModelReady] = useState<boolean>(false);
  const [isTTSModelReady, setIsTTSModelReady] = useState<boolean>(false);
  const [isSTTModelReady, setIsSTTModelReady] = useState<boolean>(false);
  const [chosenLang, setChosenLang] = useState<string>('uk');

  const modelName = 'Llama-3.2-1B-Instruct-Q4_0.gguf'

  const directoryTTSPath = `${FileSystem.documentDirectory}models/`;
  const findOnnxFile = async (directoryTTSPath: string): Promise<string | null> => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(directoryTTSPath);
      if (!dirInfo.exists || !dirInfo.isDirectory) {
        return null;
      }

      const files = await FileSystem.readDirectoryAsync(directoryTTSPath);
      const onnxFile = files.find(file => file.endsWith('.onnx'));
      if (files.length === 3 && onnxFile) {
        try {
          TTSManager.initialize("medium.onnx");
        } catch (error) {
          console.log('Model is not functional');
          return null;
        }
        return onnxFile;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  };

  const checkModelExists = async () => {
    try {
      const initialFileInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}${modelName}`);
      if (initialFileInfo.exists && initialFileInfo.size > 500000000) {
        // console.log("File exists:", true);
        return true;
      }
    } catch (error) {
      console.error("Error checking file existence:", error);
      return false;
    }
  };

  const checkSTTModelExists = async () => {
    try {
      const initialFileInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}ggml-base-q8_0.bin`);
      if (initialFileInfo.exists) {
        console.log("File exists:", true);
        return true;
      }
      console.log('not existing')

      return false;
    } catch (error) {
      console.error("Error checking file existence:", error);
      return false;
    }
  };

  const checkTTSModelExists = async () => {
    if (directoryTTSPath) {
      const ttsModelName = await findOnnxFile(directoryTTSPath);
      if (!ttsModelName) {
        return false;
      }
      const initialFolderInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}models/`);
      if (initialFolderInfo.exists && initialFolderInfo.isDirectory) {
        setIsTTSModelReady(true);
        return true;
      }
    } else {
      return false;
    }
  };

  const handleDownloadModel = async (character: string, characterAccent: string) => {

    setProgress(0);

    if (await checkModelExists()) {
      const modelExists = await loadModel();
      if (modelExists) {
        return;
      }
    } else {
      setIsDownloading(true);
      try {
        await downloadModel(chosenLang, (progress) =>
          setProgress(progress)
        );
    
        // After downloading, load the model
        await loadModel();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        Alert.alert("Error", `Download failed: ${errorMessage}`);
      } finally {
        setIsDownloading(false);
      }
    }
    
    if (!(await checkTTSModelExists())) {
      setProgress(0);

      setIsTTSDownloading(true);
      try {
        await downloadTTSModel(character, characterAccent, (progress) =>
          setProgress(progress)
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        Alert.alert("Error", `Download failed: ${errorMessage}`);
      } finally {
        setIsTTSDownloading(false);
        setIsTTSModelReady(true);
      }
    }

    if (!(await checkSTTModelExists())) {
      setProgress(0);

      setIsSTTDownloading(true);
      try {
        console.log('trying to download')
        await downloadSTTModel((progress) =>
          setProgress(progress)
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        Alert.alert("Error", `Download failed: ${errorMessage}`);
      } finally {
        setIsSTTDownloading(false);
        setIsSTTModelReady(true);
      }
    } else {
      return;
    }
  }

  const handleDownloadTTSModel = async (character: string, characterAccent: string) => {
    setProgress(0);
    setIsTTSModelReady(false);
    setIsTTSDownloading(true);
    try {
      await downloadTTSModel(character, characterAccent, (progress) =>
        setProgress(progress)
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error", `Download failed: ${errorMessage}`);
    } finally {
      setIsTTSDownloading(false);
      setIsTTSModelReady(true);
    }
  };

  const handleDownloadSTTModel = async () => {
    setProgress(0);
    setIsSTTModelReady(false);
    setIsSTTDownloading(true);
    try {
      await downloadSTTModel((progress) =>
        setProgress(progress)
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error", `Download failed: ${errorMessage}`);
    } finally {
      setIsSTTDownloading(false);
      setIsSTTModelReady(true);
    }
  };

  // const stopGeneration = async () => {
  //   try {
  //     await context.stopCompletion();
  //     setIsGenerating(false);
  //     setIsLoading(false);

  //     setConversation((prev) => {
  //       const lastMessage = prev[prev.length - 1];
  //       if (lastMessage.role === 'assistant') {
  //         return [
  //           ...prev.slice(0, -1),
  //           {
  //             ...lastMessage,
  //             content: lastMessage.content + "\n\n*Generation stopped by user*",
  //           },
  //         ];
  //       }
  //       return prev;
  //     });
  //   } catch (error) {
  //     console.error("Error stopping completion:", error);
  //   }
  // };

  const loadModel = async (): Promise<boolean> => {
    try {
      const destPath = `${FileSystem.documentDirectory}${modelName}`;
      // console.log("destPath : ", destPath);
      if (context) {
        await releaseAllLlama();
        setContext(null);
      }
      const llamaContext = await initLlama({
        model: destPath,
        use_mlock: true,
        n_ctx: 2048,
        n_gpu_layers: Platform.OS === 'ios' ? 99 : 0,
      }).catch(err => {
        console.log("Error initializing Llama:", err);
        throw new Error("Failed to initialize Llama");
      });
      setContext(llamaContext);
      // Alert.alert("Model Loaded", "The model was successfully loaded.");
      setIsModelReady(true)
      return true;
    } catch (error) {
      console.log("error : ", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error Loading Model", errorMessage);
      return false;
    }
  };

  return {
    context,
    isGenerating,
    isModelReady,
    isDownloading,
    isTTSDownloading,
    isSTTDownloading,
    isTTSModelReady,
    isSTTModelReady,
    progress,
    chosenLang,
    setChosenLang,
    checkModelExists,
    checkTTSModelExists,
    checkSTTModelExists,
    handleDownloadModel,
    handleDownloadTTSModel,
    handleDownloadSTTModel,
    loadModel,
    setIsGenerating,
  };
};