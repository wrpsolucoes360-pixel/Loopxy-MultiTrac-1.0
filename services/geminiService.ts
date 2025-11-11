
import { GoogleGenAI, Type } from '@google/genai';
import { Song, SongSection } from '../types';

// FIX: Per @google/genai coding guidelines, the API key is assumed to be available
// in the execution context, so the check for its existence has been removed.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const songStructureSchema = {
  type: Type.OBJECT,
  properties: {
    sections: {
      type: Type.ARRAY,
      description: 'The different sections of the song, like Intro, Verse, Chorus.',
      items: {
        type: Type.OBJECT,
        properties: {
          label: {
            type: Type.STRING,
            description: 'The name of the song section (e.g., "Verse 1", "Chorus", "Bridge").',
          },
          durationPercentage: {
            type: Type.NUMBER,
            description: 'The relative duration of this section as a percentage of the total song length. All percentages should sum to 100.',
          },
        },
        required: ['label', 'durationPercentage'],
      },
    },
  },
  required: ['sections'],
};

export const getSongStructureFromGemini = async (title: string, artist: string): Promise<SongSection[]> => {
  try {
    const prompt = `Analyze the typical song structure for the song "${title}" by "${artist}". Provide the sections in chronological order (e.g., Intro, Verse, Chorus, Bridge, Outro). For each section, estimate its duration as a percentage of the total song length. The sum of all percentages must be exactly 100.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: songStructureSchema,
      },
    });

    const jsonString = response.text.trim();
    const parsed = JSON.parse(jsonString);

    if (parsed && parsed.sections) {
      // Basic validation
      const totalPercentage = parsed.sections.reduce((sum: number, section: { durationPercentage: number }) => sum + section.durationPercentage, 0);
      if (Math.abs(totalPercentage - 100) > 5) {
        console.warn(`Gemini returned song structure with total percentage of ${totalPercentage}. Normalizing...`);
        // Normalize percentages if they don't sum to 100
        return parsed.sections.map((s: SongSection) => ({
            ...s,
            durationPercentage: (s.durationPercentage / totalPercentage) * 100
        }));
      }
      return parsed.sections;
    }
    return [];
  } catch (error) {
    console.error('Error fetching song structure from Gemini:', error);
    // Re-throw the error so the calling component can handle it (e.g., show a toast)
    throw new Error('Could not get song structure from AI.');
  }
};


const setlistCreationSchema = {
    type: Type.OBJECT,
    properties: {
        setlistName: {
            type: Type.STRING,
            description: "A creative and fitting name for the generated setlist."
        },
        songTitles: {
            type: Type.ARRAY,
            description: "An ordered list of song titles from the provided library to be included in the setlist.",
            items: {
                type: Type.STRING,
            }
        }
    },
    required: ['setlistName', 'songTitles']
}

export const createSetlistFromGemini = async (prompt: string, availableSongs: Song[]): Promise<{setlistName: string, songIds: string[]}> => {
    const songLibraryString = availableSongs.map(s => `- "${s.title}" by ${s.artist} (Key: ${s.key}, ${s.bpm} BPM)`).join('\n');

    const fullPrompt = `
You are a music director creating a setlist for a performance.
The user's request is: "${prompt}".

Here is the library of songs you can choose from:
${songLibraryString}

Based on the user's request, create a coherent and musically appropriate setlist using ONLY the songs from the provided library. Consider the mood, tempo (BPM), and key of the songs to create a good flow. The response must be a valid JSON object.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: fullPrompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: setlistCreationSchema,
            }
        });

        const jsonString = response.text.trim();
        const parsed = JSON.parse(jsonString);

        if (parsed && parsed.setlistName && parsed.songTitles) {
            const songIds = parsed.songTitles
                .map((title: string) => availableSongs.find(s => s.title === title)?.id)
                .filter((id: string | undefined): id is string => !!id);
            
            return { setlistName: parsed.setlistName, songIds };
        }
        throw new Error("Invalid response structure from Gemini.");

    } catch (error) {
        console.error('Error creating setlist with Gemini:', error);
        throw error;
    }
};

const stemSeparationSchema = {
    type: Type.OBJECT,
    properties: {
        stems: {
            type: Type.ARRAY,
            description: "A list of distinct instrumental and vocal stem names.",
            items: {
                type: Type.STRING,
                description: "The name of a single stem (e.g., 'Drums', 'Piano', 'Lead Vocals')."
            }
        }
    },
    required: ['stems']
};

export const analyzeTrackListFromAudio = async (title: string, artist: string): Promise<string[]> => {
    const prompt = `You are an expert audio engineer with deep knowledge of popular music arrangements.
    Based on the song title "${title}" by "${artist}", list the most common and distinct instrumental and vocal stems you would expect to find in a professional multitrack session for this song.
    
    Consider the typical instrumentation for the artist and genre. Be specific (e.g., 'Acoustic Guitar', 'Synth Pad', 'Backing Vocals').
    
    Provide a list of 4 to 8 stems.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: stemSeparationSchema,
            }
        });

        const jsonString = response.text.trim();
        const parsed = JSON.parse(jsonString);

        if (parsed && parsed.stems && Array.isArray(parsed.stems) && parsed.stems.length > 0) {
            return parsed.stems;
        }

        throw new Error("Invalid response structure from Gemini.");

    } catch (error) {
        console.error('Error analyzing track list from Gemini:', error);
        throw new Error("Failed to get stem suggestions from AI.");
    }
};