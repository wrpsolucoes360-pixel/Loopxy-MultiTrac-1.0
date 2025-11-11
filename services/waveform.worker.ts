// services/waveform.worker.ts

interface AudioData {
    [trackId: string]: Float32Array;
}

/**
 * Processes multiple audio channels into a single, composite waveform data array.
 * @param audioData - An object where keys are track IDs and values are Float32Array of audio samples.
 * @param targetPoints - The desired number of points in the final waveform array.
 * @returns An array of numbers (0-1) representing the waveform peaks.
 */
function processAudio(audioData: AudioData, targetPoints: number): number[] {
    const tracks = Object.values(audioData);
    if (tracks.length === 0) return [];

    // Find the length of the longest track
    const maxLength = Math.max(...tracks.map(t => t.length));
    
    const compositeSamples = new Float32Array(maxLength).fill(0);

    // Mix down all tracks into a single composite track by summing samples
    for (const track of tracks) {
        for (let i = 0; i < track.length; i++) {
            compositeSamples[i] += track[i];
        }
    }
    
    // Normalize the composite track to prevent clipping
    let maxAmp = 0;
    for (let i = 0; i < compositeSamples.length; i++) {
        maxAmp = Math.max(maxAmp, Math.abs(compositeSamples[i]));
    }
    if (maxAmp > 1) {
        for (let i = 0; i < compositeSamples.length; i++) {
            compositeSamples[i] /= maxAmp;
        }
    }

    // Downsample to targetPoints
    const waveformPoints: number[] = [];
    const bucketSize = Math.floor(maxLength / targetPoints);
    if (bucketSize === 0) return [];

    for (let i = 0; i < targetPoints; i++) {
        const start = i * bucketSize;
        const end = start + bucketSize;
        let max = 0;
        for (let j = start; j < end; j++) {
            const val = Math.abs(compositeSamples[j] || 0);
            if (val > max) {
                max = val;
            }
        }
        waveformPoints.push(max);
    }
    
    return waveformPoints;
}


self.onmessage = (event: MessageEvent<{ audioData: AudioData; points: number }>) => {
    const { audioData, points } = event.data;
    try {
        const waveform = processAudio(audioData, points);
        self.postMessage({ status: 'success', waveform });
    } catch (error) {
        self.postMessage({ status: 'error', message: (error as Error).message });
    }
};
