"use client";

import { useState, useRef, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { extractAudioFeatures, generateFingerprint } from "~/lib/audio";
import { type AudioFeatures } from "~/types/audio";
import Link from "next/link";

export default function IdentifyPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const identifyAudio = api.audio.identifyAudio.useQuery(
    { 
      fingerprint: audioFeatures ? generateFingerprint(audioFeatures) : "",
      minSimilarity: 0.5, // Lower threshold for identification
    },
    { enabled: !!audioFeatures }
  );

  useEffect(() => {
    const wavesurfer = WaveSurfer.create({
      container: "#waveform",
      waveColor: "#4F46E5",
      progressColor: "#818CF8",
      cursorColor: "#4F46E5",
      barWidth: 2,
      barRadius: 3,
      cursorWidth: 1,
      height: 100,
      barGap: 3,
    });

    wavesurferRef.current = wavesurfer;

    return () => {
      wavesurfer.destroy();
    };
  }, []);

  const processAudioData = async (audioBuffer: AudioBuffer) => {
    setIsProcessing(true);
    setError(null);
    try {
      const audioData = audioBuffer.getChannelData(0);
      const features = extractAudioFeatures(audioData);
      setAudioFeatures(features);
    } catch (err) {
      setError("Error processing audio data");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        await processAudioData(audioBuffer);
        
        if (wavesurferRef.current) {
          wavesurferRef.current.loadBlob(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Stop recording after 30 seconds
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 30000);
    } catch (error) {
      setError("Error accessing microphone");
      console.error(error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 p-4">
      <div className="w-full max-w-2xl space-y-8 rounded-lg bg-white/10 p-8 backdrop-blur-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-white">
            Identify Audio
          </h1>
          <Link href="/record">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              Go to Record
            </Button>
          </Link>
        </div>
        
        <div className="space-y-4">
          <div
            id="waveform"
            className="h-32 w-full rounded-lg bg-white/5 p-4"
          />
          
          <div className="flex justify-center">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              className={`${
                isRecording
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
              disabled={isProcessing}
            >
              {isRecording ? "Stop Recording" : "Start Recording"}
            </Button>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 p-4 text-red-500">
              {error}
            </div>
          )}

          {isProcessing && (
            <div className="text-center text-white">
              Processing audio...
            </div>
          )}

          {identifyAudio.data && identifyAudio.data.length > 0 && (
            <div className="mt-4 rounded-lg bg-white/5 p-4">
              <h2 className="text-xl font-semibold text-white">Matches Found:</h2>
              <ul className="mt-2 space-y-2">
                {identifyAudio.data.map((match) => (
                  <li
                    key={match.id}
                    className="flex items-center justify-between text-white"
                  >
                    <span>{match.name}</span>
                    <span className="text-sm text-white/70">
                      {match.duration}s • {Math.round(match.similarity * 100)}% match
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {identifyAudio.data && identifyAudio.data.length === 0 && (
            <div className="text-center text-white/70">
              No matches found. Try recording again or check the database for saved fingerprints.
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 