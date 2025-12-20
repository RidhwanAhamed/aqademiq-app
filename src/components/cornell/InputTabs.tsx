import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, FileUp, PenLine } from "lucide-react";
import { FileUpload } from "./FileUpload";
import { DepthSelector } from "./DepthSelector";
import type { DepthLevel } from "@/types/cornell";

interface InputTabsProps {
  onGenerate: (data: {
    topic?: string;
    fileContent?: string;
    fileName?: string;
    filePrompt?: string;
    depthLevel: DepthLevel;
  }) => void;
  isGenerating: boolean;
}

export function InputTabs({ onGenerate, isGenerating }: InputTabsProps) {
  const [activeTab, setActiveTab] = useState<"topic" | "file">("topic");
  const [topic, setTopic] = useState("");
  const [filePrompt, setFilePrompt] = useState("");
  const [depthLevel, setDepthLevel] = useState<DepthLevel>("standard");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState("");

  const handleFileSelect = (file: File | null, content: string) => {
    setSelectedFile(file);
    setFileContent(content);
  };

  const canGenerate =
    activeTab === "topic"
      ? topic.trim().length > 0
      : selectedFile !== null && fileContent.length > 0;

  const handleSubmit = () => {
    if (!canGenerate || isGenerating) return;

    if (activeTab === "topic") {
      onGenerate({
        topic: topic.trim(),
        depthLevel,
      });
    } else {
      onGenerate({
        fileContent,
        fileName: selectedFile?.name,
        filePrompt: filePrompt.trim() || undefined,
        depthLevel,
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "topic" | "file")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="topic" className="gap-2">
            <PenLine className="h-4 w-4" />
            Enter Topic
          </TabsTrigger>
          <TabsTrigger value="file" className="gap-2">
            <FileUp className="h-4 w-4" />
            Upload File
          </TabsTrigger>
        </TabsList>

        <TabsContent value="topic" className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic or Subject</Label>
            <Textarea
              id="topic"
              placeholder="e.g., Photosynthesis in plants, World War II causes and effects, Introduction to Machine Learning..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-[120px] resize-none"
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              Enter any topic and Ada AI will generate comprehensive Cornell Notes
            </p>
          </div>
        </TabsContent>

        <TabsContent value="file" className="mt-4 space-y-4">
          <FileUpload
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
          />
          
          {selectedFile && (
            <div className="space-y-2">
              <Label htmlFor="filePrompt">Custom Instructions (Optional)</Label>
              <Textarea
                id="filePrompt"
                placeholder="e.g., Focus on key formulas and definitions, Emphasize practical examples, Include study questions..."
                value={filePrompt}
                onChange={(e) => setFilePrompt(e.target.value)}
                className="min-h-[80px] resize-none"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                Tell Ada how you want the notes organized
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <DepthSelector value={depthLevel} onChange={setDepthLevel} />

      <Button
        onClick={handleSubmit}
        disabled={!canGenerate || isGenerating}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Notes...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Cornell Notes
          </>
        )}
      </Button>
    </div>
  );
}
