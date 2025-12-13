import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: December 2024
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Introduction</h2>
            <p className="text-muted-foreground">
              Welcome to Aqademiq ("we," "our," or "us"). We are committed to protecting your personal 
              information and your right to privacy. This Privacy Policy explains how we collect, use, 
              disclose, and safeguard your information when you use our mobile application and services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Information We Collect</h2>
            <h3 className="text-xl font-medium">Personal Information</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Email address (for account creation and authentication)</li>
              <li>Name (optional, for personalization)</li>
              <li>Academic information (courses, assignments, exams) that you enter</li>
              <li>Study session data and statistics</li>
            </ul>

            <h3 className="text-xl font-medium">Automatically Collected Information</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Device information (type, operating system)</li>
              <li>Usage data (features used, time spent in app)</li>
              <li>Crash reports and performance data</li>
            </ul>

            <h3 className="text-xl font-medium">Camera and Photo Library Access</h3>
            <p className="text-muted-foreground">
              We request camera and photo library access solely to allow you to scan and import 
              timetables, documents, and course materials. These images are processed for text 
              extraction and are not shared with third parties.
            </p>

            <h3 className="text-xl font-medium">Microphone Access</h3>
            <p className="text-muted-foreground">
              Microphone access is used only for voice commands with Ada AI assistant. Audio is 
              processed in real-time and is not stored or transmitted.
            </p>

            <h3 className="text-xl font-medium">Calendar Access</h3>
            <p className="text-muted-foreground">
              If you choose to sync with Google Calendar, we access your calendar only to import 
              and export academic events. This integration is optional and can be revoked at any time.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>To provide and maintain our service</li>
              <li>To personalize your experience</li>
              <li>To send you reminders and notifications (with your consent)</li>
              <li>To analyze usage patterns and improve our app</li>
              <li>To provide AI-powered study recommendations</li>
              <li>To communicate with you about updates and support</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Data Storage and Security</h2>
            <p className="text-muted-foreground">
              Your data is stored securely using Supabase, which provides enterprise-grade security 
              including encryption at rest and in transit. We implement Row Level Security (RLS) 
              to ensure you can only access your own data.
            </p>
            <p className="text-muted-foreground">
              We retain your data for as long as your account is active. You can request deletion 
              of your account and associated data at any time.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Third-Party Services</h2>
            <p className="text-muted-foreground">We use the following third-party services:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Supabase:</strong> Database and authentication</li>
              <li><strong>Google:</strong> OAuth authentication and Calendar integration</li>
              <li><strong>OCR.Space:</strong> Document text extraction</li>
              <li><strong>OpenAI/Google AI:</strong> AI-powered features</li>
            </ul>
            <p className="text-muted-foreground">
              Each service has its own privacy policy, and we encourage you to review them.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Your Rights</h2>
            <p className="text-muted-foreground">You have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Opt out of marketing communications</li>
              <li>Revoke third-party integrations (e.g., Google Calendar)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Children's Privacy</h2>
            <p className="text-muted-foreground">
              Aqademiq is designed for students of all ages. For users under 13 (or applicable age 
              of consent in your jurisdiction), parental consent may be required. We do not knowingly 
              collect personal information from children without parental consent.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-muted-foreground">
              <strong>Email:</strong> support@aqademiq.app<br />
              <strong>Website:</strong> https://aqademiq.app
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
