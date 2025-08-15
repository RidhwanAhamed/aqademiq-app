import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Onboarding() {
  const [email, setEmail] = useState('');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'black',
      fontSize: '18px'
    }}>
      <div>
        <h1>Onboarding Step Test</h1>
        <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" />
        <Button onClick={() => alert(email)}>Test Button</Button>
      </div>
    </div>
  );
}

