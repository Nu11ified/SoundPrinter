import { type AudioFeatures } from "~/types/audio";

const SAMPLE_RATE = 44100;
const FFT_SIZE = 2048;
const MIN_FREQUENCY = 20;
const MAX_FREQUENCY = 8000;
const PEAK_THRESHOLD = 0.05;
const MIN_PEAKS = 5;
const MAX_PEAKS = 200;
const TIME_WINDOW = 0.05;
const FREQUENCY_BANDS = [
  { min: 20, max: 300 },    // Bass
  { min: 300, max: 2000 },  // Mid
  { min: 2000, max: 8000 }, // High
] as const;

interface Peak {
  amplitude: number;
  frequency: number;
  time: number;
}

type BandKey = `${typeof FREQUENCY_BANDS[number]["min"]}-${typeof FREQUENCY_BANDS[number]["max"]}`;

export function extractAudioFeatures(audioData: Float32Array): AudioFeatures {
  const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
  const buffer = audioContext.createBuffer(1, audioData.length, SAMPLE_RATE);
  buffer.copyToChannel(audioData, 0);

  const analyser = audioContext.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(analyser);

  const frequencies = new Float32Array(analyser.frequencyBinCount);
  const peaks: number[] = [];
  const timestamps: number[] = [];
  const frequencyData: number[] = [];
  
  // Initialize bandPeaks with all possible band keys
  const bandPeaks = FREQUENCY_BANDS.reduce((acc, band) => {
    const bandKey: BandKey = `${band.min}-${band.max}`;
    acc[bandKey] = [];
    return acc;
  }, {} as { [K in BandKey]: Peak[] });

  // Process the audio in chunks
  const chunkSize = FFT_SIZE;
  for (let offset = 0; offset < audioData.length; offset += chunkSize) {
    analyser.getFloatFrequencyData(frequencies);
    const time = offset / SAMPLE_RATE;
    
    // Find peaks in each frequency band
    for (let i = 0; i < frequencies.length; i++) {
      const frequency = i * SAMPLE_RATE / FFT_SIZE;
      const frequencyValue = frequencies.at(i);
      
      if (frequencyValue !== undefined) {
        const amplitude = Math.pow(10, frequencyValue / 20);
        
        // Find which frequency band this belongs to
        const band = FREQUENCY_BANDS.find(b => frequency >= b.min && frequency <= b.max);
        if (band && amplitude > PEAK_THRESHOLD) {
          const bandKey: BandKey = `${band.min}-${band.max}`;
          const peak: Peak = { amplitude, frequency, time };
          bandPeaks[bandKey].push(peak);
        }
      }
    }
  }

  // Process peaks in each band
  Object.entries(bandPeaks).forEach(([band, bandPeaks]) => {
    // Sort peaks by amplitude
    bandPeaks.sort((a, b) => b.amplitude - a.amplitude);
    
    // Take the strongest peaks while maintaining time distribution
    const selectedPeaks = selectPeaksWithTimeDistribution(bandPeaks);
    
    selectedPeaks.forEach(peak => {
      peaks.push(peak.amplitude);
      frequencyData.push(peak.frequency);
      timestamps.push(peak.time);
    });
  });

  // If we don't have enough peaks, try to get more by lowering the threshold
  if (peaks.length < MIN_PEAKS) {
    // Try to find more peaks with a lower threshold
    const additionalPeaks = findAdditionalPeaks(audioData, PEAK_THRESHOLD * 0.5);
    if (additionalPeaks.length > 0) {
      peaks.push(...additionalPeaks.map(p => p.amplitude));
      frequencyData.push(...additionalPeaks.map(p => p.frequency));
      timestamps.push(...additionalPeaks.map(p => p.time));
    }
  }

  // If we still don't have enough peaks, return what we have
  // This is better than throwing an error as it allows for partial matching
  return {
    peaks,
    frequencies: frequencyData,
    timestamps,
  };
}

function findAdditionalPeaks(audioData: Float32Array, threshold: number): Peak[] {
  const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
  const buffer = audioContext.createBuffer(1, audioData.length, SAMPLE_RATE);
  buffer.copyToChannel(audioData, 0);

  const analyser = audioContext.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(analyser);

  const frequencies = new Float32Array(analyser.frequencyBinCount);
  const additionalPeaks: Peak[] = [];

  analyser.getFloatFrequencyData(frequencies);
  for (let i = 0; i < frequencies.length; i++) {
    const frequency = i * SAMPLE_RATE / FFT_SIZE;
    const frequencyValue = frequencies.at(i);
    
    if (frequencyValue !== undefined) {
      const amplitude = Math.pow(10, frequencyValue / 20);
      if (amplitude > threshold) {
        additionalPeaks.push({
          amplitude,
          frequency,
          time: 0,
        });
      }
    }
  }

  return additionalPeaks;
}

function selectPeaksWithTimeDistribution(peaks: Peak[]): Peak[] {
  const selected: Peak[] = [];
  const timeWindows: { [key: number]: Peak[] } = {};
  
  // Group peaks by time windows
  peaks.forEach(peak => {
    const windowKey = Math.floor(peak.time / TIME_WINDOW);
    if (!timeWindows[windowKey]) {
      timeWindows[windowKey] = [];
    }
    timeWindows[windowKey].push(peak);
  });

  // Select the strongest peak from each time window
  Object.values(timeWindows).forEach(windowPeaks => {
    if (windowPeaks.length > 0) {
      const strongestPeak = windowPeaks[0];
      if (strongestPeak) {
        selected.push(strongestPeak);
      }
    }
  });

  // If we still need more peaks, add the strongest remaining ones
  if (selected.length < MIN_PEAKS) {
    const remainingPeaks = peaks.filter(peak => !selected.includes(peak));
    selected.push(...remainingPeaks.slice(0, MIN_PEAKS - selected.length));
  }

  // Limit the total number of peaks
  return selected.slice(0, MAX_PEAKS);
}

export function generateFingerprint(features: AudioFeatures): string {
  // Create a more robust fingerprint by combining multiple features
  const fingerprint = features.peaks
    .map((peak, i) => {
      const freq = features.frequencies[i];
      const time = features.timestamps[i];
      if (freq === undefined || time === undefined) return "";
      
      // Normalize the values for better matching
      const normalizedPeak = peak.toFixed(2);
      const normalizedFreq = Math.round(freq / 10) * 10; // Round to nearest 10Hz
      const normalizedTime = Math.round(time * 10) / 10; // Round to nearest 0.1s
      
      return `${normalizedPeak}:${normalizedFreq}:${normalizedTime}`;
    })
    .filter(Boolean)
    .join("|");

  return fingerprint;
}

export function calculateSimilarity(fingerprint1: string, fingerprint2: string): number {
  const features1 = fingerprint1.split("|").map(f => f.split(":").map(Number));
  const features2 = fingerprint2.split("|").map(f => f.split(":").map(Number));

  let matches = 0;
  let total = Math.max(features1.length, features2.length);

  // Compare features with a tolerance for slight variations
  for (const feature1 of features1) {
    const [peak1, freq1, time1] = feature1;
    if (peak1 === undefined || freq1 === undefined || time1 === undefined) continue;

    for (const feature2 of features2) {
      const [peak2, freq2, time2] = feature2;
      if (peak2 === undefined || freq2 === undefined || time2 === undefined) continue;

      // Calculate similarity score for this feature pair
      const peakSimilarity = 1 - Math.abs(peak1 - peak2);
      const freqSimilarity = 1 - Math.abs(freq1 - freq2) / 100; // Normalize frequency difference
      const timeSimilarity = 1 - Math.abs(time1 - time2) / 0.5; // Normalize time difference

      // Combined similarity score
      const similarity = (peakSimilarity + freqSimilarity + timeSimilarity) / 3;

      if (similarity > 0.7) { // Threshold for considering features as matching
        matches++;
        break;
      }
    }
  }

  return matches / total;
} 