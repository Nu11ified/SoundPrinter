"use client";

import { useState, useRef, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { extractAudioFeatures, generateFingerprint } from "~/lib/audio";
import { type AudioFeatures } from "~/types/audio";
import Link from "next/link";
import { motion } from "framer-motion";

export default function RecordPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null);
  const [duration, setDuration] = useState(0);
  const [name, setName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createFingerprint = api.audio.createFingerprint.useMutation({
    onSuccess: () => {
      setSuccess("Fingerprint saved successfully!");
      setName("");
      setAudioFeatures(null);
      setAudioData(null);
      if (wavesurferRef.current) {
        wavesurferRef.current.empty();
      }
    },
    onError: (error) => {
      setError(error.message);
    },
  });

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
      setAudioData(audioData);
      setDuration(audioBuffer.duration);
      
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

      // Stop recording after 2 minutes
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 120000);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      await processAudioData(audioBuffer);

      const audioBlob = new Blob([arrayBuffer], { type: file.type });
      if (wavesurferRef.current) {
        wavesurferRef.current.loadBlob(audioBlob);
      }
    } catch (err) {
      setError("Error processing audio file");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveFingerprint = async () => {
    if (!name.trim()) {
      setError("Please enter a name for the fingerprint");
      return;
    }

    if (!audioFeatures) {
      setError("No audio data to save");
      return;
    }

    await createFingerprint.mutateAsync({
      name: name.trim(),
      fingerprint: generateFingerprint(audioFeatures),
      duration: Math.round(duration),
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="relative w-full max-w-4xl space-y-8 rounded-2xl bg-white/5 p-12 backdrop-blur-xl">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
          <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        </div>

        <div className="flex items-center justify-between">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold text-white"
          >
            Record Audio
          </motion.h1>
          <Link href="/">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/10">
                Back to Home
              </Button>
            </motion.div>
          </Link>
        </div>
        
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-xl bg-white/5 p-6"
          >
            <div
              id="waveform"
              className="h-32 w-full rounded-lg bg-white/5 p-4"
            />
          </motion.div>
          
          <div className="flex flex-col items-center space-y-6">
            <div className="flex w-full space-x-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1"
              >
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-full h-12 text-lg ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                  disabled={isProcessing}
                >
                  {isRecording ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
                      <span>Recording...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      <span>Start Recording</span>
                    </div>
                  )}
                </Button>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1"
              >
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-12 text-lg bg-white/10 hover:bg-white/20 text-white border border-white/10"
                  disabled={isProcessing}
                >
                  <div className="flex items-center space-x-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Upload Audio</span>
                  </div>
                </Button>
              </motion.div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="audio/*"
              className="hidden"
            />

            {audioFeatures && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full space-y-4"
              >
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter a name for this fingerprint"
                    className="w-full rounded-lg bg-white/5 px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-white/10"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                </div>
                <Button
                  onClick={saveFingerprint}
                  className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                  disabled={isProcessing || !name.trim()}
                >
                  <div className="flex items-center space-x-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span>Save Fingerprint</span>
                  </div>
                </Button>
              </motion.div>
            )}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-red-500/10 p-4 text-red-500 border border-red-500/20"
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-green-500/10 p-4 text-green-500 border border-green-500/20"
            >
              {success}
            </motion.div>
          )}

          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center space-x-2 text-white"
            >
              <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
              <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-500 delay-100" />
              <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-500 delay-200" />
              <span>Processing audio...</span>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
} 