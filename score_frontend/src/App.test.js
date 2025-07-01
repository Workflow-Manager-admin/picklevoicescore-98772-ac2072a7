import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Helpers to mock SpeechRecognition API
class MockSpeechRecognition {
  constructor() {
    this.continuous = false;
    this.interimResults = false;
    this.lang = 'en-US';
    // Event handlers
    this.onstart = null;
    this.onend = null;
    this.onresult = null;
    this.onerror = null;
    this._isStarted = false;
  }
  start() {
    this._isStarted = true;
    if (this.onstart) this.onstart();
  }
  stop() {
    this._isStarted = false;
    if (this.onend) this.onend();
  }
  // Manually trigger a result event for testing
  mockResult(transcriptText) {
    if (this.onresult) {
      this.onresult({
        results: [
          [{ transcript: transcriptText, confidence: 0.99 }]
        ]
      });
    }
    if (this.onend) this.onend();
  }
  // For error simulation
  mockError(errorText) {
    if (this.onerror) {
      this.onerror({ error: errorText });
    }
    if (this.onend) this.onend();
  }
}

window.SpeechRecognition = MockSpeechRecognition;
window.webkitSpeechRecognition = MockSpeechRecognition;
window.speechSynthesis = {
  speak: jest.fn(),
};

function getByRoleAndText(container, role, text) {
  const candidates = container.querySelectorAll(`[role="${role}"]`);
  return Array.from(candidates).find(el =>
    (el.textContent || "").toLowerCase().includes(text.toLowerCase())
  );
}

test("voice command 'pickle' triggers score entry via mocked speech recognition", async () => {
  const { container } = render(<App />);
  // Find the voice command button
  const voiceBtn = getByRoleAndText(container, 'button', 'voice command');
  expect(voiceBtn).toBeInTheDocument();

  // Click to "start" listening
  fireEvent.click(voiceBtn);

  // Get the recognition instance and simulate voice input
  // Since our App sets this in a useRef
  // We access the global mock instance:
  // retrieve the latest SpeechRecognition instance
  // (The App component stores it as recognitionRef.current)
  // So we patch the prototype to keep track
  let recognitionInstance;
  const orig = window.SpeechRecognition;
  window.SpeechRecognition = function() {
    recognitionInstance = new orig();
    return recognitionInstance;
  };

  // Rerender to ensure our patched SpeechRecognition is used
  render(<App />);

  // Trigger the listening button (again, this time for the patched instance)
  const newVoiceBtn = getByRoleAndText(container, 'button', 'voice command');
  fireEvent.click(newVoiceBtn);

  // Simulate saying: "pickle 5 3"
  recognitionInstance.mockResult('pickle 5 3');

  // Expect: Score flashes as "5-3" somewhere in the document
  await waitFor(() => {
    expect(screen.getByText(/5-3/)).toBeInTheDocument();
  });

  // Also, transcript should show the spoken phrase
  expect(screen.getByText(/pickle 5 3/i)).toBeInTheDocument();

  // Status message should indicate score updated
  expect(screen.getByText(/score updated/i)).toBeInTheDocument();
});

test("voice command 'hey pickle, what’s the score?' triggers speech output with latest score", async () => {
  const { container } = render(<App />);
  // Patch SpeechRecognition to track test instances
  let recognitionInstance;
  const orig = window.SpeechRecognition;
  window.SpeechRecognition = function() {
    recognitionInstance = new orig();
    return recognitionInstance;
  };

  // Set up known score first: "pickle 8 5"
  render(<App />);
  let voiceBtn = getByRoleAndText(container, 'button', 'voice command');
  fireEvent.click(voiceBtn);
  recognitionInstance.mockResult('pickle 8 5');
  await waitFor(() => {
    expect(screen.getByText(/8-5/)).toBeInTheDocument();
  });

  // Now: ask "hey pickle, what's the score?"
  voiceBtn = getByRoleAndText(container, 'button', 'voice command');
  fireEvent.click(voiceBtn);
  recognitionInstance.mockResult("hey pickle, what’s the score?");
  // Expect: status updated and speech output called
  await waitFor(() => {
    expect(screen.getByText(/answered with the current score/i)).toBeInTheDocument();
  });
  // Speech output: "The score is 8 to 5"
  expect(window.speechSynthesis.speak).toHaveBeenCalledWith(
    expect.objectContaining({
      text: expect.stringMatching(/8 to 5/),
    })
  );
});
