import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function TermsOfService() {
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

        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: December 2024
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using Aqademiq ("the App"), you agree to be bound by these Terms of 
              Service. If you do not agree to these terms, please do not use the App.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Description of Service</h2>
            <p className="text-muted-foreground">
              Aqademiq is an academic planning and study management application that provides:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Course and semester management</li>
              <li>Assignment and exam tracking</li>
              <li>Study session planning with Pomodoro timer</li>
              <li>AI-powered study assistance (Ada AI)</li>
              <li>Calendar and schedule management</li>
              <li>Document scanning and OCR processing</li>
              <li>Analytics and performance tracking</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. User Accounts</h2>
            <p className="text-muted-foreground">
              To use certain features of the App, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and complete information</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Acceptable Use</h2>
            <p className="text-muted-foreground">You agree not to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Use the App for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the App's functionality</li>
              <li>Upload malicious content or malware</li>
              <li>Use the App to harass, abuse, or harm others</li>
              <li>Reverse engineer or attempt to extract source code</li>
              <li>Use automated systems to access the App without permission</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. User Content</h2>
            <p className="text-muted-foreground">
              You retain ownership of all content you create or upload to the App (courses, 
              assignments, notes, documents). By using the App, you grant us a limited license 
              to store, process, and display your content solely to provide our services to you.
            </p>
            <p className="text-muted-foreground">
              You are responsible for ensuring you have the right to upload any content, including 
              scanned documents and images.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. AI Features</h2>
            <p className="text-muted-foreground">
              The App includes AI-powered features (Ada AI) that provide study recommendations, 
              schedule suggestions, and content parsing. These features:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Are provided for informational purposes only</li>
              <li>May not always be accurate or complete</li>
              <li>Should not be solely relied upon for academic decisions</li>
              <li>May use third-party AI services subject to their own terms</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Third-Party Integrations</h2>
            <p className="text-muted-foreground">
              The App may integrate with third-party services (e.g., Google Calendar). Your use 
              of these integrations is subject to the respective third-party terms of service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Intellectual Property</h2>
            <p className="text-muted-foreground">
              The App, including its design, features, and content (excluding user content), is 
              owned by Aqademiq and protected by intellectual property laws. You may not copy, 
              modify, distribute, or create derivative works without our permission.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground">
              THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. 
              WE DO NOT GUARANTEE THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">10. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, 
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF 
              THE APP, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, ACADEMIC PERFORMANCE, OR 
              MISSED DEADLINES.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">11. Termination</h2>
            <p className="text-muted-foreground">
              We may suspend or terminate your access to the App at any time for violation of 
              these Terms or for any other reason. You may delete your account at any time through 
              the App settings.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">12. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update these Terms from time to time. Continued use of the App after changes 
              constitutes acceptance of the new Terms. We will notify you of significant changes.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">13. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with applicable laws, 
              without regard to conflict of law principles.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">14. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about these Terms, please contact us at:
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
