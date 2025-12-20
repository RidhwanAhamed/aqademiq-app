import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check, X, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableTextProps {
  value: string;
  onSave: (value: string) => void;
  onDelete?: () => void;
  isMultiline?: boolean;
  placeholder?: string;
  className?: string;
}

export function EditableText({
  value,
  onSave,
  onDelete,
  isMultiline = false,
  placeholder = "Click to edit",
  className,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    if (editValue.trim()) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isMultiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-start gap-2">
        {isMultiline ? (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="min-h-[60px] text-sm"
          />
        ) : (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="text-sm"
          />
        )}
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
            onClick={handleSave}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={handleCancel}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-2 p-2 -m-2 rounded-md cursor-pointer transition-colors hover:bg-accent/50",
        className
      )}
      onClick={() => {
        setEditValue(value);
        setIsEditing(true);
      }}
    >
      <span className="flex-1 text-sm">{value || placeholder}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        {onDelete && (
          <Trash2
            className="h-3.5 w-3.5 text-destructive cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          />
        )}
      </div>
    </div>
  );
}
