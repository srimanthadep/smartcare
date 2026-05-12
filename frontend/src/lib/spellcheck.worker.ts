
import * as Comlink from 'comlink';
import nspell from 'nspell';
import { DENTAL_TERMS } from './medical-terms';

let spell: any = null;

const worker = {
  async init(userWords: string[] = []) {
    if (spell) return;

    try {
      console.log("Worker: Fetching dictionaries...");
      const [affResp, dicResp] = await Promise.all([
        fetch('/dicts/en-US.aff'),
        fetch('/dicts/en-US.dic')
      ]);
      
      const aff = await affResp.text();
      const dic = await dicResp.text();
      
      if (!affResp.ok || !dicResp.ok) {
        throw new Error(`Dictionary load failed: ${affResp.status} ${dicResp.status}`);
      }

      console.log(`Worker: Initializing nspell (aff: ${aff.length}, dic: ${dic.length})...`);
      spell = nspell(aff, dic);
      console.log("Worker: nspell initialized.");
      console.log("Worker: Test check 'hello':", spell.correct("hello"));
      
      // Add custom medical/dental terms
      DENTAL_TERMS.forEach(term => {
        try {
          spell.add(term);
        } catch (e) {
          // Ignore errors for already existing words
        }
      });

      // Add user-defined words
      userWords.forEach(word => {
        try {
          spell.add(word);
        } catch (e) {
          // Ignore
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize spellchecker:', error);
      return false;
    }
  },

  async check(word: string) {
    console.log(`Worker: Received check request for "${word}"`);
    if (!spell) {
      console.warn("Worker: Spellchecker not initialized yet.");
      return true;
    }
    try {
      const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").trim();
      if (!cleanWord) return true;
      const result = spell.correct(cleanWord);
      console.log(`Worker: Checking "${cleanWord}" -> ${result}`);
      return result;
    } catch (e) {
      console.error("Worker: Check error", e);
      return true;
    }
  },

  async suggest(word: string) {
    console.log(`Worker: Received suggest request for "${word}"`);
    if (!spell) return [];
    try {
      const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").trim();
      if (!cleanWord) return [];
      const results = spell.suggest(cleanWord);
      console.log(`Worker: Suggestions for "${cleanWord}" ->`, results);
      return results;
    } catch (e) {
      console.error("Worker: Suggest error", e);
      return [];
    }
  },

  addWord(word: string) {
    if (spell) {
      try {
        spell.add(word);
      } catch (e) {
        // Ignore
      }
    }
  }
};

Comlink.expose(worker);
