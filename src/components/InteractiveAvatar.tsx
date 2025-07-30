import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, Video, VideoOff, Send, Play, Square, Users, UserCheck, Hotel, Calendar, Phone, X, Bot } from "lucide-react";
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

// Agent role configurations
interface RoleConfig {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  avatarName: string;
  heygenShareUrl?: string;
  prompt?: string;
}

// Chat message interface
interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const roleConfigs: RoleConfig[] = [
  {
    id: "customer-service",
    label: "Customer Service",
    description: "Talk to an AI that helps customers with questions and support issues",
    icon: <Users className="w-4 h-4" />,
    avatarName: "Katya_Chair_Sitting_public",
    prompt: "You are a helpful customer service representative. Assist users with their questions and provide excellent support."
  },
  {
    id: "receptionist", 
    label: "Receptionist",
    description: "Speak to an AI receptionist that greets visitors and manages appointments",
    icon: <UserCheck className="w-4 h-4" />,
    avatarName: "Alessandra_Chair_Sitting_public",
    prompt: "You are a professional receptionist. Greet visitors warmly and help them with their needs."
  },
  {
    id: "concierge",
    label: "Concierge", 
    description: "Talk to a luxury hotel concierge AI for personalized guest services",
    icon: <Hotel className="w-4 h-4" />,
    avatarName: "Anastasia_Chair_Sitting_public",
    prompt: "You are a luxury hotel concierge. Provide personalized recommendations and exceptional service."
  },
  {
    id: "appointment-setter",
    label: "Appointment Setter",
    description: "AI assistant specialized in scheduling and managing appointments efficiently",
    icon: <Calendar className="w-4 h-4" />,
    avatarName: "Amina_Chair_Sitting_public", 
    prompt: "You are an appointment setting specialist. Help users schedule appointments efficiently."
  },
  {
    id: "ai-ivr",
    label: "AI IVR",
    description: "Interactive voice response system for call routing and information",
    icon: <Phone className="w-4 h-4" />,
    avatarName: "Elenora_IT_Sitting_public",
    prompt: "You are an AI IVR system. Help callers navigate options and connect them to the right department."
  }
];

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
  const [activeRole, setActiveRole] = useState<string>("customer-service");
  
  // Voice chat state
  const [currentMode, setCurrentMode] = useState<"text" | "voice">("text");
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  
  // Chat history state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isAiTyping, setIsAiTyping] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  // Get current role config
  const currentRole = roleConfigs.find(role => role.id === activeRole) || roleConfigs[0];

  useEffect(() => {
    loadSDK();
    initializeAudioRecorder();
  }, []);

  // Handle role switching - restart session if connected with new role
  useEffect(() => {
    if (isConnected && avatar) {
      // Show notification about role change
      toast({
        title: "Role Changed",
        description: `Switched to ${currentRole.label}. Restart session to apply changes.`,
      });
    }
  }, [activeRole, isConnected, avatar, currentRole.label, toast]);

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

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const addChatMessage = (content: string, isUser: boolean) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      isUser,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, newMessage]);
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

    // Add user message to chat
    addChatMessage(text.trim(), true);
    
    setIsSpeaking(true);
    setIsAiTyping(true);
    try {
      console.log('Calling avatar.speak with text:', text);
      await avatar.speak({ text: text.trim() });
      
      // Add AI response to chat (simulated for now)
      setTimeout(() => {
        addChatMessage("I understand what you're saying. Let me help you with that.", false);
        setIsAiTyping(false);
      }, 1000);
      
      toast({
        title: "Voice Message Sent",
        description: `Avatar is speaking: "${text}"`,
      });
    } catch (error) {
      console.error("Failed to speak transcribed text:", error);
      setIsAiTyping(false);
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

    // Check for OpenAI API key and show suggestion if missing
    const openaiKey = localStorage.getItem('openai_api_key');
    if (!openaiKey) {
      toast({
        title: "OpenAI API Key Recommended",
        description: "Consider setting up your OpenAI API key below for enhanced text mode voice recording features.",
        variant: "default",
      });
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
        avatarName: currentRole.avatarName,
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

    const messageText = userInput.trim();
    
    // Add user message to chat
    addChatMessage(messageText, true);
    
    setIsSpeaking(true);
    setIsAiTyping(true);
    try {
      await avatar.speak({
        text: messageText,
      });
      setUserInput("");
      
      // Add AI response to chat (simulated for now)
      setTimeout(() => {
        addChatMessage("Thank you for your message. I'm here to help you with any questions you may have.", false);
        setIsAiTyping(false);
      }, 1500);
      
      toast({
        title: "Message Sent",
        description: "Avatar is speaking your message.",
      });
    } catch (error) {
      console.error("Failed to speak:", error);
      setIsAiTyping(false);
      toast({
        title: "Speech Error",
        description: "Failed to send message to avatar.",
        variant: "destructive",
      });
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleChatSend = () => {
    if (currentMode === "text") {
      handleSpeak();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
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

        {/* Agent Scenario Tabs */}
        <Tabs value={activeRole} onValueChange={setActiveRole} className="w-full">
          <TabsList className="inline-flex h-12 items-center justify-start rounded-full bg-gray-100 p-1 text-gray-600 overflow-x-auto scrollbar-hide w-full max-w-4xl mx-auto">
            {roleConfigs.map((role) => (
              <TabsTrigger
                key={role.id}
                value={role.id}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:border data-[state=active]:border-purple-500 data-[state=active]:shadow-sm data-[state=active]:text-purple-700 data-[state=active]:font-semibold hover:bg-gray-200 gap-2 min-w-max"
              >
                {role.icon}
                {role.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {/* Tab Content Sections */}
          {roleConfigs.map((role) => (
            <TabsContent key={role.id} value={role.id} className="mt-4">
              <div className="p-4 rounded-lg border border-gray-300 bg-white shadow-sm min-h-[480px]">
                {/* Role Description */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center justify-center gap-2">
                    {role.icon}
                    {role.label}
                  </h3>
                  <p className="text-gray-600">
                    {role.description}
                  </p>
                </div>

                {/* Two-Panel Layout: Avatar Video + Chat History */}
                <div className="flex flex-col lg:flex-row gap-6 min-h-[500px]">
                  {/* Left Panel: Avatar Video (60-70% width) */}
                  <div className="lg:w-[65%] space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Video className="w-5 h-5 text-gray-700" />
                      <span className="font-medium text-gray-900">Avatar Display</span>
                      <Badge variant={isConnected ? "default" : "secondary"} className="ml-auto">
                        {isConnected ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>
                    
                    <div className="aspect-video bg-gray-50 rounded-lg overflow-hidden relative border border-gray-200">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      {!isConnected && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <VideoOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">
                              Start a session to see your {role.label.toLowerCase()}
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

                    {/* Session Controls */}
                    <div className="space-y-3">
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
                    </div>
                  </div>

                  {/* Right Panel: Chat History (30-40% width) */}
                  {isChatVisible && (
                    <div className="lg:w-[35%] flex flex-col">
                      <div className="rounded-lg border border-gray-300 bg-white shadow-sm overflow-hidden flex flex-col h-[500px]">
                        {/* Chat Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                          <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-purple-600" />
                            <span className="font-medium text-gray-900">Chatting with {role.label}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsChatVisible(false)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Chat Messages */}
                        <ScrollArea className="flex-1 p-4">
                          <div className="space-y-4">
                            {chatMessages.length === 0 && (
                              <div className="text-center text-gray-500 text-sm py-8">
                                Start chatting with your {role.label.toLowerCase()}!
                              </div>
                            )}
                            
                            {chatMessages.map((message) => (
                              <div
                                key={message.id}
                                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[80%] px-4 py-2 rounded-lg text-sm ${
                                    message.isUser
                                      ? 'bg-purple-600 text-white ml-auto'
                                      : 'bg-gray-100 text-gray-900'
                                  }`}
                                >
                                  <p>{message.content}</p>
                                  <p className={`text-xs mt-1 opacity-70 ${
                                    message.isUser ? 'text-purple-100' : 'text-gray-500'
                                  }`}>
                                    {message.timestamp.toLocaleTimeString([], { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </p>
                                </div>
                              </div>
                            ))}
                            
                            {/* Typing Indicator */}
                            {isAiTyping && (
                              <div className="flex justify-start">
                                <div className="max-w-[80%] px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-900">
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <div ref={chatEndRef} />
                          </div>
                        </ScrollArea>

                        {/* Chat Input Area */}
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                          <div className="flex gap-2">
                            <Input
                              ref={chatInputRef}
                              placeholder="Type your message..."
                              value={userInput}
                              onChange={(e) => setUserInput(e.target.value)}
                              onKeyPress={handleKeyPress}
                              disabled={!isConnected || isSpeaking || isAiTyping}
                              className="flex-1"
                            />
                            <Button
                              variant="cyber"
                              onClick={handleChatSend}
                              disabled={!isConnected || !userInput.trim() || isSpeaking || isAiTyping}
                              className="px-3"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show Chat Button when hidden */}
                  {!isChatVisible && (
                    <div className="lg:w-[35%] flex items-start justify-center pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsChatVisible(true)}
                        className="flex items-center gap-2"
                      >
                        <Bot className="w-4 h-4" />
                        Show Chat
                      </Button>
                    </div>
                  )}
                </div>

                {/* Additional Controls - Only show when not in text mode or chat is hidden */}
                {(currentMode !== "text" || !isChatVisible) && (
                  <div className="mt-6 space-y-6">
                    {/* Voice Recording (OpenAI STT) - Show when in text mode and chat is hidden */}
                    {currentMode === "text" && !isChatVisible && (
                      <>
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
                          <div className="p-2 bg-gray-50 rounded border border-gray-200">
                            <p className="text-xs text-gray-600">{recordingStatus}</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Voice Mode Controls */}
                    {currentMode === "voice" && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">Voice Chat</h4>
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-2 h-2 rounded-full ${isVoiceChatActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                            <span className="text-sm font-medium text-purple-900">Voice Chat Active</span>
                          </div>
                          {voiceStatus && (
                            <p className="text-sm text-purple-700">{voiceStatus}</p>
                          )}
                          <p className="text-xs text-purple-600 mt-2">
                            Simply speak to interact with the avatar. No buttons needed!
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Status Information */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">Status</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <span className="text-sm text-gray-600">{isConnected ? 'Connected' : 'Disconnected'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSpeaking ? <MicOff className="w-4 h-4 text-gray-600" /> : <Mic className="w-4 h-4 text-gray-600" />}
                          <span className="text-sm text-gray-600">{isSpeaking ? 'Speaking' : 'Ready'}</span>
                        </div>
                      </div>
                    </div>

                    {/* API Key Setup - Only show for text mode */}
                    {currentMode === "text" && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">OpenAI API Key Setup</h4>
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
                        <p className="text-xs text-gray-500">
                          Required for speech-to-text functionality in Text Mode. Your key is stored locally.
                        </p>
                      </div>
                    )}

                    {/* Instructions */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h5 className="font-medium mb-2 text-gray-900">How to get started:</h5>
                      <ol className="text-sm text-gray-600 space-y-1">
                        <li>1. Click "Start Session" to connect to your {role.label.toLowerCase()}</li>
                        <li>2. Choose between Text Mode or Voice Mode</li>
                        <li>3. <strong>Voice Mode:</strong> Simply speak - no setup required!</li>
                        <li>4. <strong>Text Mode:</strong> Use the chat panel or voice recording</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default InteractiveAvatar;