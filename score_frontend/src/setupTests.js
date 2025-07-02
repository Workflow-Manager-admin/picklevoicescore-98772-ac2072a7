import 'regenerator-runtime/runtime';
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// --- speechSynthesis and getVoices Jest/jsdom mock setup ---

if (typeof window !== 'undefined') {
  if (!window.speechSynthesis) {
    window.speechSynthesis = {};
  }
  if (!window.speechSynthesis.getVoices) {
    // Return a default set of English voices
    window.speechSynthesis.getVoices = jest.fn(() => [
      {
        voiceURI: 'Google US English',
        name: 'Google US English',
        lang: 'en-US',
        localService: false,
        default: true,
      },
    ]);
  } else {
    jest.spyOn(window.speechSynthesis, 'getVoices').mockImplementation(() => [
      {
        voiceURI: 'Google US English',
        name: 'Google US English',
        lang: 'en-US',
        localService: false,
        default: true,
      },
    ]);
  }
  // Optionally mock speak and cancel
  if (!window.speechSynthesis.speak) {
    window.speechSynthesis.speak = jest.fn();
  }
  if (!window.speechSynthesis.cancel) {
    window.speechSynthesis.cancel = jest.fn();
  }
  // Utterance constructor mock
  if (!window.SpeechSynthesisUtterance) {
    window.SpeechSynthesisUtterance = function SpeechSynthesisUtteranceMock(text) {
      this.text = text;
      this.lang = 'en-US';
      this.rate = 1;
    };
  }
}
