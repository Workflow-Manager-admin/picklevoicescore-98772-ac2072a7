console.log("[jest.speech.mock.setup.js] Mocking window.speechSynthesis and getVoices (pre-import)");
if (typeof window !== "undefined") {
  // Create speechSynthesis if missing
  if (!Object.prototype.hasOwnProperty.call(window, "speechSynthesis")) {
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      writable: true,
      enumerable: true,
      value: {},
    });
  }
  // Define getVoices mock if missing
  if (
    !Object.prototype.hasOwnProperty.call(window.speechSynthesis, "getVoices")
  ) {
    Object.defineProperty(window.speechSynthesis, "getVoices", {
      configurable: true,
      writable: true,
      enumerable: true,
      value: jest.fn(() => [
        {
          voiceURI: "Test English",
          name: "Test English",
          lang: "en-US",
          localService: false,
          default: true,
        },
      ]),
    });
  }
  // Stub .speak if missing
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
  // Stub .cancel
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
  // Stub .pause and .resume
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
  // Mock SpeechSynthesisUtterance global for safety
  if (typeof window.SpeechSynthesisUtterance !== "function") {
    window.SpeechSynthesisUtterance = function SpeechSynthesisUtteranceMock(text) {
      this.text = text;
      this.lang = "en-US";
      this.rate = 1;
      this.pitch = 1;
      this.volume = 1;
    };
  }
  // Confirm correct type signatures
  console.log("[jest.speech.mock.setup.js] speechSynthesis.getVoices:", typeof window.speechSynthesis.getVoices, window.speechSynthesis.getVoices());
}
