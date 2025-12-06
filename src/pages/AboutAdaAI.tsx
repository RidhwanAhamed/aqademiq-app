/* README — src/pages/AboutAdaAI.tsx
This informational page explains how Ada AI operates and what backend endpoints power it. The backend must expose GET /api/ada/info returning { hero: { title, subtitle }, highlights: Highlight[], faq: FaqItem[] }, where Highlight includes { id, title, description, icon }, and FaqItem includes { id, question, answer }. */
// Purpose: Provide an overview of Ada AI with backend-driven copy. TODO: API -> /api/ada/info.
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, Sparkles, ShieldCheck, Brain, Zap, ArrowRight } from 'lucide-react';

interface Highlight {
  id: string;
  title: string;
  description: string;
  icon: 'sparkles' | 'shield' | 'brain' | 'zap';
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface AdaInfoResponse {
  hero: {
    title: string;
    subtitle: string;
    ctaLabel: string;
  };
  highlights: Highlight[];
  faq: FaqItem[];
}

const ICON_MAP = {
  sparkles: Sparkles,
  shield: ShieldCheck,
  brain: Brain,
  zap: Zap
};

const AboutAdaAI = () => {
  const [data, setData] = useState<AdaInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        // TODO: API -> /api/ada/info
        // const response = await fetch('/api/ada/info');
        // const payload = await response.json();
        // setData(payload);
        setData({
          hero: {
            title: 'Ada AI keeps your academic world in sync.',
            subtitle: 'From parsing syllabi to balancing study time, Ada automates planning so you can focus on learning.',
            ctaLabel: 'Chat with Ada'
          },
          highlights: [
            {
              id: 'automation',
              title: 'Agentic scheduling',
              description: 'Ada reads your syllabus, maps assignments to the calendar, and suggests optimal study blocks.',
              icon: 'sparkles'
            },
            {
              id: 'privacy',
              title: 'Privacy-first brain',
              description: 'Your data stays encrypted with zero third-party sharing. Audit logs help you track how Ada assists you.',
              icon: 'shield'
            },
            {
              id: 'insights',
              title: 'Context-aware insights',
              description: 'Ada reasons over coursework, deadlines, and energy levels to surface coaching tips in real time.',
              icon: 'brain'
            },
            {
              id: 'speed',
              title: 'Accelerated focus',
              description: 'Quick actions and file uploads cut setup time so you can move from idea to action instantly.',
              icon: 'zap'
            }
          ],
          faq: [
            {
              id: 'data',
              question: 'How does Ada use my data?',
              answer:
                'All uploaded files and chat transcripts stay in your encrypted workspace. Ada summarizes context on-device before calling backend AI.'
            },
            {
              id: 'integrations',
              question: 'Can Ada sync with my calendar?',
              answer:
                'Yes. Once you connect Google Calendar, Ada can confirm events, detect conflicts, and push updates automatically.'
            },
            {
              id: 'ai-model',
              question: 'Which AI model powers Ada?',
              answer:
                'We prototype with Gemini 2.5 Flash for reasoning speed. The backend will swap models as soon as improved options become available.'
            }
          ]
        });
      } catch (error) {
        console.error('Failed to load Ada info', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, []);

  if (loading || !data) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-10">
      <Card className="p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-primary shadow">
              <Bot className="h-4 w-4" />
              Meet Ada AI
            </div>
            <h1 className="text-3xl font-bold text-foreground">{data.hero.title}</h1>
            <p className="text-muted-foreground text-sm md:text-base">{data.hero.subtitle}</p>
            <div className="flex flex-wrap gap-3 pt-4">
              <Button asChild className="shadow-lg">
                <a href="/ada">
                  {data.hero.ctaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/calendar">See schedule sync</a>
              </Button>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="secondary" className="text-xs tracking-wide">
              Beta access live
            </Badge>
            <p className="text-sm text-muted-foreground max-w-xs text-right">
              Launch Ada to co-plan study weeks, run focus sessions, and auto-resolve schedule conflicts with a single tap.
            </p>
          </div>
        </div>
      </Card>

      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Capabilities</p>
          <h2 className="text-2xl font-semibold">Why students rely on Ada daily</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {data.highlights.map((highlight) => {
            const Icon = ICON_MAP[highlight.icon];
            return (
              <Card key={highlight.id} className="p-6 space-y-3 border-border/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold">{highlight.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{highlight.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">FAQ</p>
          <h2 className="text-2xl font-semibold">Everything you ask about Ada</h2>
        </div>
        <div className="space-y-4">
          {data.faq.map((faq) => (
            <Card key={faq.id} className="p-6 border-border/60">
              <h3 className="font-semibold mb-2">{faq.question}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AboutAdaAI;

