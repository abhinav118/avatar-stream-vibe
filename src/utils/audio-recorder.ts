export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;

  constructor(
    private onStatusChange: (status: string) => void,
    private onTranscriptionComplete: (text: string) => void
  ) {}

  async startRecording() {
    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');
      
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.isRecording = true;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Received audio chunk:', event.data.size, 'bytes');
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        console.log('Recording stopped, processing audio...');
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        console.log('Audio blob size:', audioBlob.size, 'bytes');
        await this.sendToWhisper(audioBlob);
      };

      this.mediaRecorder.start(1000); // Collect data every second
      console.log('Started recording');
      this.onStatusChange('Recording... Speak now');
    } catch (error) {
      console.error('Error starting recording:', error);
      this.onStatusChange('Error: ' + (error as Error).message);
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      console.log('Stopping recording...');
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.onStatusChange('Processing audio...');
      
      // Stop all tracks in the stream
      const stream = this.mediaRecorder.stream;
      stream.getTracks().forEach(track => track.stop());
    }
  }

  private async sendToWhisper(audioBlob: Blob) {
    try {
      console.log('Sending audio to Whisper API...');
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');

      // Note: In production, this should be done through a backend endpoint
      // to keep the API key secure
      const openaiKey = localStorage.getItem('openai_api_key');
      if (!openaiKey) {
        throw new Error('OpenAI API key not found. Please add your API key.');
      }

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      const data = await response.json();
      console.log('Received transcription:', data.text);
      this.onStatusChange('');
      this.onTranscriptionComplete(data.text);
    } catch (error) {
      console.error('Error transcribing audio:', error);
      this.onStatusChange('Error: Failed to transcribe audio');
    }
  }

  get recording() {
    return this.isRecording;
  }
}
