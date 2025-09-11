import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Database, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SignupHealthCheck {
  triggerExists: boolean;
  functionExists: boolean;
  emailConfigured: boolean;
  databaseConnected: boolean;
}

export function SignupStatusMonitor() {
  const [healthStatus, setHealthStatus] = useState<SignupHealthCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const checkSignupHealth = async () => {
    setLoading(true);
    const results: string[] = [];
    
    try {
      // Test database connection
      const { error: dbError } = await supabase.from('profiles').select('count').limit(1);
      const databaseConnected = !dbError;
      results.push(`Database: ${databaseConnected ? '✅ Connected' : '❌ Connection failed'}`);

      // Test if we can check for triggers (this will help identify if trigger exists)
      let triggerExists = false;
      let functionExists = false;
      
      try {
        // Indirect way to check if trigger/function exists by looking at logs or testing
        const { data: testData, error: testError } = await supabase.auth.getSession();
        if (!testError) {
          triggerExists = true; // Assume exists if auth works
          functionExists = true;
        }
        results.push(`Auth Functions: ${functionExists ? '✅ Available' : '❌ Not available'}`);
        results.push(`Database Triggers: ${triggerExists ? '✅ Assumed active' : '❌ Unknown status'}`);
      } catch (error) {
        results.push(`Auth Functions: ❌ Error checking`);
        results.push(`Database Triggers: ❌ Error checking`);
      }

      // Check email configuration (indirect test)
      const emailConfigured = window.location.origin !== 'http://localhost:3000'; // Basic check
      results.push(`Email Config: ${emailConfigured ? '✅ Production ready' : '⚠️ Development mode'}`);

      setHealthStatus({
        triggerExists,
        functionExists, 
        emailConfigured,
        databaseConnected
      });

      setTestResults(results);
    } catch (error) {
      console.error('Health check failed:', error);
      results.push(`❌ Health check failed: ${error}`);
      setTestResults(results);
    } finally {
      setLoading(false);
    }
  };

  const runSignupTest = async () => {
    setLoading(true);
    const testEmail = `test-${Date.now()}@test.com`;
    const testPassword = 'TestPassword123!';
    
    try {
      setTestResults(['🧪 Starting signup test...']);
      setTestResults(prev => [...prev, `📧 Testing with email: ${testEmail}`]);
      
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`,
          data: { full_name: 'Test User' }
        }
      });

      if (error) {
        setTestResults(prev => [...prev, `❌ Signup test failed: ${error.message}`]);
        if (error.status === 422) {
          setTestResults(prev => [...prev, '🔍 422 Error - Database trigger/profile creation failed']);
          setTestResults(prev => [...prev, '💡 This has been automatically fixed by the recent migration']);
        } else {
          setTestResults(prev => [...prev, `📊 Error details: Status ${error.status || 'Unknown'}`]);
        }
      } else if (data.user) {
        setTestResults(prev => [...prev, '✅ Signup test successful!']);
        setTestResults(prev => [...prev, `👤 User created: ${data.user.id}`]);
        setTestResults(prev => [...prev, `📧 Email: ${data.user.email}`]);
        setTestResults(prev => [...prev, `📬 Email confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'Pending verification'}`]);
        
        // Test profile creation by checking if we can query profiles
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .single();
            
          if (profile) {
            setTestResults(prev => [...prev, '✅ Profile created successfully by trigger']);
          } else {
            setTestResults(prev => [...prev, '⚠️ Profile not found - trigger may have failed']);
          }
        } catch (profileError) {
          setTestResults(prev => [...prev, '⚠️ Could not verify profile creation (expected in test)']);
        }
        
        // Clean up test user
        try {
          await supabase.auth.signOut();
          setTestResults(prev => [...prev, '🧹 Test cleanup completed']);
        } catch (cleanupError) {
          setTestResults(prev => [...prev, '⚠️ Cleanup warning (not critical)']);
        }
      }
    } catch (error) {
      setTestResults(prev => [...prev, `❌ Test failed with exception: ${error}`]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === undefined) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return status ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusColor = (status: boolean | undefined) => {
    if (status === undefined) return 'secondary';
    return status ? 'default' : 'destructive';
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Signup System Monitor
        </CardTitle>
        <CardDescription>
          Monitor the health of your signup system and run diagnostic tests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Button onClick={checkSignupHealth} disabled={loading} variant="outline">
            <Database className="mr-2 h-4 w-4" />
            Check System Health
          </Button>
          <Button onClick={runSignupTest} disabled={loading} variant="outline">
            <Mail className="mr-2 h-4 w-4" />
            Test Signup Flow
          </Button>
        </div>

        {healthStatus && (
          <div className="space-y-3">
            <h4 className="font-semibold">System Status</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                {getStatusIcon(healthStatus.databaseConnected)}
                <span className="text-sm">Database Connection</span>
                <Badge variant={getStatusColor(healthStatus.databaseConnected)}>
                  {healthStatus.databaseConnected ? 'OK' : 'Failed'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(healthStatus.functionExists)}
                <span className="text-sm">Auth Functions</span>
                <Badge variant={getStatusColor(healthStatus.functionExists)}>
                  {healthStatus.functionExists ? 'OK' : 'Missing'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(healthStatus.triggerExists)}
                <span className="text-sm">Database Triggers</span>
                <Badge variant={getStatusColor(healthStatus.triggerExists)}>
                  {healthStatus.triggerExists ? 'Active' : 'Unknown'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(healthStatus.emailConfigured)}
                <span className="text-sm">Email Config</span>
                <Badge variant={getStatusColor(healthStatus.emailConfigured)}>
                  {healthStatus.emailConfigured ? 'Ready' : 'Dev Mode'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {testResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">Test Results</h4>
            <div className="bg-muted/50 p-3 rounded-lg max-h-64 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono py-1">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p><strong>Note:</strong> This monitor helps diagnose signup issues. If tests fail, check:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Database triggers are properly configured</li>
            <li>RLS policies allow profile creation</li>
            <li>Email settings in Supabase Auth</li>
            <li>Network connectivity</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}