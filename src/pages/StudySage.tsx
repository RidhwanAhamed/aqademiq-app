import { StudySageChat } from "@/components/StudySageChat";
import { Card } from "@/components/ui/card";
import { Bot, Upload, MessageSquare, Calendar, Zap } from "lucide-react";

const StudySage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent">
            StudySage
          </h1>
          <p className="text-muted-foreground">
            Your AI-powered academic assistant for intelligent schedule management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-3 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20">
            <Bot className="w-8 h-8 text-primary" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Chat Interface */}
        <div className="md:col-span-2">
          <Card className="h-[700px] flex flex-col">
            <StudySageChat />
          </Card>
        </div>

        {/* Features & Help Panel */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              What I Can Do
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Upload className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">File Analysis</h4>
                  <p className="text-xs text-muted-foreground">
                    Upload syllabi, timetables, or schedules for automatic parsing
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Conflict Detection</h4>
                  <p className="text-xs text-muted-foreground">
                    Automatically detect and resolve scheduling conflicts
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Smart Planning</h4>
                  <p className="text-xs text-muted-foreground">
                    Get personalized study plans and schedule recommendations
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Quick Tips</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="p-3 bg-primary/5 rounded-lg">
                <p className="font-medium text-foreground mb-1">📄 Upload Files</p>
                <p>I can read PDFs, images, and text files containing your academic schedules.</p>
              </div>
              
              <div className="p-3 bg-secondary/5 rounded-lg">
                <p className="font-medium text-foreground mb-1">🤖 Chat Naturally</p>
                <p>Ask me about creating study schedules, managing deadlines, or organizing your courses.</p>
              </div>
              
              <div className="p-3 bg-accent/5 rounded-lg">
                <p className="font-medium text-foreground mb-1">⚡ Auto-Import</p>
                <p>I'll automatically create courses, assignments, and exams from your uploaded documents.</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Supported File Types</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-muted rounded text-center">PDF</div>
              <div className="p-2 bg-muted rounded text-center">JPG</div>
              <div className="p-2 bg-muted rounded text-center">PNG</div>
              <div className="p-2 bg-muted rounded text-center">TXT</div>
              <div className="p-2 bg-muted rounded text-center">DOC</div>
              <div className="p-2 bg-muted rounded text-center">DOCX</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudySage;