/**
 * Pre-test environment setup.
 * - Ensures window.speechSynthesis and window.speechSynthesis.getVoices exist before any use/import.
 * - Uses Object.defineProperty to define the properties for global mocking and compatibility.
 * - Stubs all necessary speechSynthesis methods so voice-related code can run in tests.
 */

// Mock speechSynthesis and getVoices BEFORE any imports
if (typeof window !== "undefined") {
  // Define the speechSynthesis object on window if it doesn't exist
  if (!Object.prototype.hasOwnProperty.call(window, "speechSynthesis")) {
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      writable: true,
      enumerable: true,
      value: {},
    });
  }

  // Define getVoices as a function that returns a stubbed voice array
  if (
    !Object.prototype.hasOwnProperty.call(window.speechSynthesis, "getVoices")
  ) {
    Object.defineProperty(window.speechSynthesis, "getVoices", {
      configurable: true,
      writable: true,
      enumerable: true,
      value: jest.fn(() => [
        {
          voiceURI: "Google US English",
          name: "Google US English",
          lang: "en-US",
          localService: false,
          default: true,
        },
      ]),
    });
  }

  // Stub .speak method if missing
  if (
    !Object.prototype.hasOwnProperty.call(window.speechSynthesis, "speak")
  ) {
    Object.defineProperty(window.speechSynthesis, "speak", {
      configurable: true,
      writable: true,
      enumerable: true,
      value: jest.fn(),
    });
  }

  // Stub .cancel method if missing
  if (
    !Object.prototype.hasOwnProperty.call(window.speechSynthesis, "cancel")
  ) {
    Object.defineProperty(window.speechSynthesis, "cancel", {
      configurable: true,
      writable: true,
      enumerable: true,
      value: jest.fn(),
    });
  }

  // Stub .pause and .resume methods if needed
  if (
    !Object.prototype.hasOwnProperty.call(window.speechSynthesis, "pause")
  ) {
    Object.defineProperty(window.speechSynthesis, "pause", {
      configurable: true,
      writable: true,
      enumerable: true,
      value: jest.fn(),
    });
  }

  if (
    !Object.prototype.hasOwnProperty.call(window.speechSynthesis, "resume")
  ) {
    Object.defineProperty(window.speechSynthesis, "resume", {
      configurable: true,
      writable: true,
      enumerable: true,
      value: jest.fn(),
    });
  }

  // Mock the SpeechSynthesisUtterance global constructor
  if (typeof window.SpeechSynthesisUtterance !== "function") {
    window.SpeechSynthesisUtterance = function SpeechSynthesisUtteranceMock(
      text
    ) {
      this.text = text;
      this.lang = "en-US";
      this.rate = 1;
      this.pitch = 1;
      this.volume = 1;
    };
  }
}

// Polyfill for jest-dom and regenerator after mocks to ensure it's after window mocks
import "regenerator-runtime/runtime";
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
