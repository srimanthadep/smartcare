
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Groq API key not found in environment variables");
  }

  const formData = new FormData();
  formData.append("file", audioBlob, "recording.m4a");
  formData.append("model", "whisper-large-v3");
  formData.append("response_format", "json");
  // Add prompt to enforce strict English translation and handle Indian context
  formData.append("prompt", "Strictly translate all spoken audio to English. If the user speaks in Hinglish, Telugu, or Hindi, provide only the English translation. Preserve medical terms and Indian names accurately.");

  try {
    const response = await fetch("https://api.groq.com/openai/v1/audio/translations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Transcription failed");
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
};
