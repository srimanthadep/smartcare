
import * as Comlink from 'comlink';

export interface Spellchecker {
  init(userWords?: string[]): Promise<boolean>;
  check(word: string): Promise<boolean>;
  suggest(word: string): Promise<string[]>;
  addWord(word: string): Promise<void>;
}

let globalWorker: Worker | null = null;
let globalProxy: Comlink.Remote<Spellchecker> | null = null;

const USER_WORDS_KEY = 'smartcare_user_dictionary';

export const getSpellchecker = async (): Promise<Comlink.Remote<Spellchecker>> => {
  if (globalProxy) return globalProxy;

  console.log("Spellcheck: Creating new worker instance...");
  // @ts-ignore
  globalWorker = new Worker(new URL('./spellcheck.worker.ts', import.meta.url), {
    type: 'module'
  });

  globalProxy = Comlink.wrap<Spellchecker>(globalWorker);
  
  const userWords = JSON.parse(localStorage.getItem(USER_WORDS_KEY) || '[]');
  console.log("Spellcheck: Initializing proxy with words:", userWords.length);
  await globalProxy.init(userWords);
  
  return globalProxy;
};

export const addToUserDictionary = async (word: string) => {
  const checker = await getSpellchecker();
  await checker.addWord(word);
  
  const userWords = JSON.parse(localStorage.getItem(USER_WORDS_KEY) || '[]');
  if (!userWords.includes(word)) {
    userWords.push(word);
    localStorage.setItem(USER_WORDS_KEY, JSON.stringify(userWords));
  }
};
