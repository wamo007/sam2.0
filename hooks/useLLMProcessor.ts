import { initLlama, releaseAllLlama } from "llama.rn";
import * as FileSystem from "expo-file-system";
import { downloadModel } from "@/configs/DownloadModel";
import { Alert, Platform } from "react-native";
import { useState } from "react";

export const useLLMProcessor = () => {

  const [progress, setProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [context, setContext] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isModelReady, setIsModelReady] = useState<boolean>(false);

  const checkFileExists = async (destPath: string) => {
    try {
      const initialFileInfo = await FileSystem.getInfoAsync(destPath);
      if (initialFileInfo.exists && initialFileInfo.size > 770000000) {
        // console.log("File exists:", true);
        return true;
      }
    } catch (error) {
      console.error("Error checking file existence:", error);
      return false;
    }
  };

  const handleDownloadModel = async (modelName: string) => {

    setIsDownloading(true);
    setProgress(0);

    const destPath = `${FileSystem.documentDirectory}${modelName}`;
    if (await checkFileExists(destPath)) {
      const success = await loadModel(modelName);
      if (success) {
        Alert.alert(
          "Info",
          `File ${destPath} already exists, we will load it directly.`
        );
        setIsDownloading(false);
        return;
      }
    }
    try {
      // console.log("before download");
      // console.log(isDownloading);

      const destPath = await downloadModel((progress) =>
        setProgress(progress)
      );

      // After downloading, load the model
      await loadModel(modelName);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error", `Download failed: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
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

  const loadModel = async (modelName: string): Promise<boolean> => {
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
    progress,
    checkFileExists,
    handleDownloadModel,
    loadModel,
    setIsGenerating,
  };
};