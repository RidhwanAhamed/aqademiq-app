import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function MarketplaceTeaserCard() {
  const navigate = useNavigate();

  return (
    <Card className="bg-gradient-marketplace border-marketplace shadow-marketplace hover:shadow-marketplace-hover transition-all duration-300 cursor-pointer group" 
          onClick={() => navigate('/marketplace')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="relative">
              <Store className="w-5 h-5 text-marketplace" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-marketplace rounded-full animate-pulse" />
            </div>
            Marketplace
          </CardTitle>
          <Badge className="bg-marketplace/10 text-marketplace border-marketplace/20 text-xs">
            Coming Soon
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <h3 className="font-semibold text-marketplace">AI-Powered Academic Marketplace</h3>
          <p className="text-sm text-muted-foreground">
            Your Learning Ecosystem is Expanding
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 text-marketplace" />
            Smart Tutor Matching
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 text-marketplace" />
            Seamless Integration
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 text-marketplace" />
            Curated Resources
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-marketplace border-marketplace/20 hover:bg-marketplace/5 group-hover:border-marketplace/40 transition-all"
        >
          Get Early Access
          <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  );
}