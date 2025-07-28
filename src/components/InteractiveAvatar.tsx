import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, Video, VideoOff, Send, Play, Square } from "lucide-react";
import { AudioRecorder } from "@/utils/audio-recorder";

// Import HeyGen Streaming Avatar SDK
let StreamingAvatar: any;
let StreamingEvents: any;
let AvatarQuality: any;

// Lazy load the SDK to avoid SSR issues
const loadSDK = async () => {
  if (typeof window !== 'undefined') {
    const sdk = await import('@heygen/streaming-avatar');
    StreamingAvatar = sdk.default;
    StreamingEvents = sdk.StreamingEvents;
    AvatarQuality = sdk.AvatarQuality;
  }
};

const InteractiveAvatar = () => {
  const [avatar, setAvatar] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState("");
  const [audioRecorder, setAudioRecorder] = useState<AudioRecorder | null>(null);
  
  // Voice chat state
  const [currentMode, setCurrentMode] = useState<"text" | "voice">("text");
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSDK();
    initializeAudioRecorder();
  }, []);

  const initializeAudioRecorder = () => {
    console.log('Initializing audio recorder...');
    const recorder = new AudioRecorder(
      (status) => {
        console.log('Recording status update:', status);
        setRecordingStatus(status);
      },
      (text) => {
        console.log('AudioRecorder callback triggered with text:', text);
        speakTranscribedText(text);
      }
    );
    setAudioRecorder(recorder);
    console.log('Audio recorder initialized');
  };

  const speakTranscribedText = async (text: string) => {
    console.log('speakTranscribedText called with:', text);
    console.log('Avatar instance:', avatar);
    console.log('Is connected:', isConnected);
    
    if (!avatar) {
      console.error('No avatar instance available');
      toast({
        title: "Avatar Error",
        description: "Avatar not connected. Please start a session first.",
        variant: "destructive",
      });
      return;
    }

    if (!isConnected) {
      console.error('Avatar not connected');
      toast({
        title: "Avatar Error", 
        description: "Avatar session not active. Please start a session first.",
        variant: "destructive",
      });
      return;
    }

    if (!text || text.trim().length === 0) {
      console.error('No text to speak');
      toast({
        title: "No Speech Detected",
        description: "No speech was detected in your recording.",
        variant: "destructive",
      });
      return;
    }

    setIsSpeaking(true);
    try {
      console.log('Calling avatar.speak with text:', text);
      await avatar.speak({ text: text.trim() });
      toast({
        title: "Voice Message Sent",
        description: `Avatar is speaking: "${text}"`,
      });
    } catch (error) {
      console.error("Failed to speak transcribed text:", error);
      toast({
        title: "Speech Error",
        description: "Failed to send voice message to avatar.",
        variant: "destructive",
      });
    } finally {
      setIsSpeaking(false);
    }
  };

  const toggleRecording = async () => {
    if (!audioRecorder) return;

    // Check for OpenAI API key
    const openaiKey = localStorage.getItem('openai_api_key');
    if (!openaiKey) {
      toast({
        title: "OpenAI API Key Required",
        description: "Please add your OpenAI API key in the settings below.",
        variant: "destructive",
      });
      return;
    }

    if (!isRecording) {
      setIsRecording(true);
      await audioRecorder.startRecording();
    } else {
      setIsRecording(false);
      audioRecorder.stopRecording();
    }
  };

  // Mock fetch access token function - replace with your actual implementation
  const fetchAccessToken = async (): Promise<string> => {
    // For demo purposes, we'll show an error message
    // toast({
    //   title: "API Key Required",
    //   description: "Please add your HeyGen API key to use the interactive avatar.",
    //   variant: "destructive",
    // });
    // throw new Error("API key not configured");
    
    // Uncomment and replace with your actual API key
    const apiKey = "MGVmNWZhZWY0YjJjNDRlMjljZTU0ZDJmYWI2YWNhNGUtMTc1MzcyNDk2NQ==";
    const response = await fetch("https://api.heygen.com/v1/streaming.create_token", {
      method: "POST",
      headers: { "x-api-key": apiKey },
    });
    const { data } = await response.json();
    return data.token;
  };

  const handleStreamReady = (event: any) => {
    if (event.detail && videoRef.current) {
      videoRef.current.srcObject = event.detail;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(console.error);
      };
      toast({
        title: "Avatar Connected",
        description: "Your interactive avatar is ready to chat!",
      });
    } else {
      console.error("Stream is not available");
    }
  };

  const handleStreamDisconnected = () => {
    console.log("Stream disconnected");
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsConnected(false);
    setIsSpeaking(false);
    toast({
      title: "Avatar Disconnected",
      description: "The avatar session has ended.",
    });
  };

  const startSession = async () => {
    if (!StreamingAvatar) {
      toast({
        title: "SDK Loading",
        description: "Please wait for the SDK to load...",
      });
      return;
    }

    setIsLoading(true);
    try {
      const token = await fetchAccessToken();
      const avatarInstance = new StreamingAvatar({ token });

      // Stream events
      avatarInstance.on(StreamingEvents.STREAM_READY, handleStreamReady);
      avatarInstance.on(StreamingEvents.STREAM_DISCONNECTED, handleStreamDisconnected);
      
      // Voice chat events
      avatarInstance.on(StreamingEvents.USER_START, () => {
        setVoiceStatus("Listening...");
      });
      avatarInstance.on(StreamingEvents.USER_STOP, () => {
        setVoiceStatus("Processing...");
      });
      avatarInstance.on(StreamingEvents.AVATAR_START_TALKING, () => {
        setVoiceStatus("Avatar is speaking...");
        setIsSpeaking(true);
      });
      avatarInstance.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        setVoiceStatus("Waiting for you to speak...");
        setIsSpeaking(false);
      });

      const sessionData = await avatarInstance.createStartAvatar({
        quality: AvatarQuality.High,
        avatarName: "Wayne_20240711", // Default avatar name
        language: "en",
      });

      setAvatar(avatarInstance);
      setSessionData(sessionData);
      setIsConnected(true);
      
      console.log("Session data:", sessionData);
    } catch (error) {
      console.error("Failed to start session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const endSession = async () => {
    if (!avatar || !sessionData) return;

    setIsLoading(true);
    try {
      if (isVoiceChatActive) {
        await avatar.closeVoiceChat();
        setIsVoiceChatActive(false);
      }
      await avatar.stopAvatar();
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setAvatar(null);
      setSessionData(null);
      setIsConnected(false);
      setIsSpeaking(false);
      setCurrentMode("text");
      setVoiceStatus("");
    } catch (error) {
      console.error("Failed to end session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = async () => {
    if (!avatar || !userInput.trim()) return;

    setIsSpeaking(true);
    try {
      await avatar.speak({
        text: userInput,
      });
      setUserInput("");
      toast({
        title: "Message Sent",
        description: "Avatar is speaking your message.",
      });
    } catch (error) {
      console.error("Failed to speak:", error);
      toast({
        title: "Speech Error",
        description: "Failed to send message to avatar.",
        variant: "destructive",
      });
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSpeak();
    }
  };

  // Voice chat functions
  const startVoiceChat = async () => {
    if (!avatar) return;
    
    try {
      await avatar.startVoiceChat({
        useSilencePrompt: false
      });
      setIsVoiceChatActive(true);
      setVoiceStatus("Waiting for you to speak...");
      toast({
        title: "Voice Chat Started",
        description: "You can now speak directly to the avatar!",
      });
    } catch (error) {
      console.error("Error starting voice chat:", error);
      setVoiceStatus("Error starting voice chat");
      toast({
        title: "Voice Chat Error",
        description: "Failed to start voice chat mode.",
        variant: "destructive",
      });
    }
  };

  const closeVoiceChat = async () => {
    if (!avatar) return;
    
    try {
      await avatar.closeVoiceChat();
      setIsVoiceChatActive(false);
      setVoiceStatus("");
      toast({
        title: "Voice Chat Ended",
        description: "Voice chat mode has been disabled.",
      });
    } catch (error) {
      console.error("Error closing voice chat:", error);
    }
  };

  const switchMode = async (mode: "text" | "voice") => {
    if (currentMode === mode || !isConnected) return;
    
    setCurrentMode(mode);
    
    if (mode === "text") {
      if (isVoiceChatActive) {
        await closeVoiceChat();
      }
    } else {
      await startVoiceChat();
    }
  };

  return (
    <div className="min-h-screen bg-background bg-gradient-bg p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            Interactive Avatar Demo
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience the future of AI communication with HeyGen's streaming avatar technology
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Video Section */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Avatar Display
                <Badge variant={isConnected ? "default" : "secondary"} className="ml-auto">
                  {isConnected ? "Connected" : "Disconnected"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-secondary/20 rounded-lg overflow-hidden relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!isConnected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <VideoOff className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Start a session to see your avatar
                      </p>
                    </div>
                  </div>
                )}
                {isSpeaking && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="neon" className="animate-pulse">
                      <Mic className="w-3 h-3 mr-1" />
                      Speaking
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Controls Section */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Avatar Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Session Controls */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Session Management</h3>
                <div className="flex gap-3">
                  <Button
                    variant="avatar"
                    onClick={startSession}
                    disabled={isConnected || isLoading}
                    className="flex-1"
                  >
                    <Play className="w-4 h-4" />
                    {isLoading ? "Starting..." : "Start Session"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={endSession}
                    disabled={!isConnected || isLoading}
                    className="flex-1"
                  >
                    <Square className="w-4 h-4" />
                    End Session
                  </Button>
                </div>
              </div>

              {/* Communication Controls */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Communication</h3>
                
                {/* Mode Toggle */}
                <div className="flex gap-2" role="group">
                  <Button
                    variant={currentMode === "text" ? "default" : "outline"}
                    onClick={() => switchMode("text")}
                    disabled={!isConnected}
                    className="flex-1"
                  >
                    Text Mode
                  </Button>
                  <Button
                    variant={currentMode === "voice" ? "default" : "outline"}
                    onClick={() => switchMode("voice")}
                    disabled={!isConnected}
                    className="flex-1"
                  >
                    Voice Mode
                  </Button>
                </div>

                {/* Text Mode Controls */}
                {currentMode === "text" && (
                  <>
                    {/* Voice Recording (OpenAI STT) */}
                    <div className="flex gap-2">
                      <Button
                        variant={isRecording ? "destructive" : "avatar"}
                        onClick={toggleRecording}
                        disabled={!isConnected}
                        className="flex-1"
                      >
                        {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        {isRecording ? "Stop Recording" : "Start Recording"}
                      </Button>
                    </div>
                    
                    {recordingStatus && (
                      <div className="p-2 bg-muted/20 rounded border border-border/50">
                        <p className="text-xs text-muted-foreground">{recordingStatus}</p>
                      </div>
                    )}
                    
                    {/* Text Input */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type something to say to the avatar..."
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={!isConnected || isSpeaking}
                        className="flex-1"
                      />
                      <Button
                        variant="cyber"
                        onClick={handleSpeak}
                        disabled={!isConnected || !userInput.trim() || isSpeaking}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Press Enter to send your message or use voice recording
                    </p>
                  </>
                )}

                {/* Voice Mode Controls */}
                {currentMode === "voice" && (
                  <div className="space-y-3">
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${isVoiceChatActive ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
                        <span className="text-sm font-medium">Voice Chat Active</span>
                      </div>
                      {voiceStatus && (
                        <p className="text-sm text-muted-foreground">{voiceStatus}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Simply speak to interact with the avatar. No buttons needed!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-neon-green' : 'bg-muted'}`} />
                    <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSpeaking ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span className="text-sm">{isSpeaking ? 'Speaking' : 'Ready'}</span>
                  </div>
                </div>
              </div>

              {/* API Key Setup - Only show for text mode */}
              {currentMode === "text" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">OpenAI API Key Setup</h3>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="Enter your OpenAI API key (sk-proj-...)..."
                      defaultValue=""
                      onChange={(e) => {
                        const value = e.target.value.trim();
                        if (value) {
                          localStorage.setItem('openai_api_key', value);
                        } else {
                          localStorage.removeItem('openai_api_key');
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.querySelector('input[type="password"]') as HTMLInputElement;
                        if (input) {
                          input.value = '';
                          localStorage.removeItem('openai_api_key');
                          toast({
                            title: "API Key Cleared",
                            description: "OpenAI API key has been removed.",
                          });
                        }
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Required for speech-to-text functionality in Text Mode. Your key is stored locally.
                  </p>
                </div>
              )}

              {/* Instructions */}
              <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
                <h4 className="font-medium mb-2">How to get started:</h4>
                <ol className="text-sm text-muted-foreground space-y-1">
                  <li>1. Click "Start Session" to connect to your avatar</li>
                  <li>2. Choose between Text Mode or Voice Mode</li>
                  <li>3. <strong>Voice Mode:</strong> Simply speak - no setup required!</li>
                  <li>4. <strong>Text Mode:</strong> Add OpenAI key for voice recording or type messages</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InteractiveAvatar;