
const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const FL_TO_SH: { [key: string]: string } = {
    'Db': 'C#',
    'Eb': 'D#',
    'Gb': 'F#',
    'Ab': 'G#',
    'Bb': 'A#',
};

/**
 * Transposes a musical key by a given number of semitones.
 * Handles sharps, flats, and minor keys.
 * @param originalKey The key to transpose (e.g., "E", "Ab", "C#m").
 * @param semitones The number of semitones to shift (can be positive or negative).
 * @returns The new, transposed key as a string.
 */
export const transposeKey = (originalKey: string, semitones: number): string => {
    if (!originalKey || semitones === 0) {
        return originalKey;
    }

    const isMinor = originalKey.endsWith('m');
    let rootNote = isMinor ? originalKey.slice(0, -1) : originalKey;
    
    // Normalize flat notes to their sharp equivalent for consistent indexing
    rootNote = FL_TO_SH[rootNote] || rootNote;
    
    const currentIndex = NOTES_SHARP.indexOf(rootNote);
    if (currentIndex === -1) {
        return originalKey; // Return original if the key is not recognized
    }

    const newIndex = (currentIndex + semitones % 12 + 12) % 12;
    const newRoot = NOTES_SHARP[newIndex];
    
    return `${newRoot}${isMinor ? 'm' : ''}`;
};
