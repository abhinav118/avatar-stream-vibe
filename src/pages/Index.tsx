import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Bot, Video, Zap, Sparkles } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background bg-gradient-bg">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <Badge variant="neon" className="mb-6">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Avatar Technology
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-6">
            Interactive Avatar
            <br />
            <span className="bg-gradient-cyber bg-clip-text text-transparent">
              Demo Platform
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Experience the future of AI communication with HeyGen's cutting-edge streaming avatar technology. 
            Create lifelike conversations with AI-powered digital humans.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/interactive-avatar">
              <Button variant="avatar" size="lg" className="text-lg px-8 py-6">
                <Video className="w-5 h-5" />
                Launch Avatar Demo
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6">
              <Bot className="w-5 h-5" />
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-elegant transition-all duration-300 hover:scale-105">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-white" />
              </div>
              <CardTitle>Real-time Streaming</CardTitle>
              <CardDescription>
                High-quality video streaming with low latency for natural conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• HD video quality</li>
                <li>• Minimal latency</li>
                <li>• Smooth animations</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-cyber transition-all duration-300 hover:scale-105">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-cyber flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <CardTitle>AI-Powered</CardTitle>
              <CardDescription>
                Advanced AI technology for natural speech and facial expressions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Natural speech synthesis</li>
                <li>• Realistic lip-sync</li>
                <li>• Emotion recognition</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-glow transition-all duration-300 hover:scale-105">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-tech flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <CardTitle>Easy Integration</CardTitle>
              <CardDescription>
                Simple SDK integration with just a few lines of code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• TypeScript support</li>
                <li>• React components</li>
                <li>• Comprehensive docs</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-gradient-primary p-1 rounded-2xl max-w-md mx-auto">
            <div className="bg-background rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
              <p className="text-muted-foreground mb-6">
                Try the interactive avatar demo and experience the future of AI communication.
              </p>
              <Link to="/interactive-avatar">
                <Button variant="avatar" size="lg" className="w-full">
                  <ArrowRight className="w-5 h-5" />
                  Start Demo Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
