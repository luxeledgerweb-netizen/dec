import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Copy } from 'lucide-react';

export default function PasswordGeneratorModal({ isOpen, onClose }) {
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  const generatePassword = useCallback(() => {
    const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
    const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numberChars = '0123456789';
    const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let charPool = lowerChars;
    if (includeUppercase) charPool += upperChars;
    if (includeNumbers) charPool += numberChars;
    if (includeSymbols) charPool += symbolChars;

    if (charPool === '') {
      setGeneratedPassword('Select at least one character type');
      return;
    }

    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charPool.length);
      password += charPool[randomIndex];
    }
    setGeneratedPassword(password);
    setCopySuccess('');
  }, [length, includeUppercase, includeNumbers, includeSymbols]);

  React.useEffect(() => {
    if (isOpen) {
      generatePassword();
    }
  }, [isOpen, generatePassword]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopySuccess('Copied!');
    setTimeout(() => setCopySuccess(''), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Password Generator</DialogTitle>
          <DialogDescription>Create a strong and secure password.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="relative">
            <Input
              readOnly
              value={generatedPassword}
              className="pr-20 text-lg font-mono"
            />
            <div className="absolute inset-y-0 right-0 flex items-center">
                <Button variant="ghost" size="icon" onClick={generatePassword}><RefreshCw className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={handleCopy}><Copy className="w-4 h-4" /></Button>
            </div>
          </div>
           {copySuccess && <p className="text-green-600 text-sm">{copySuccess}</p>}

          <div className="space-y-4">
            <div>
              <Label>Password Length: {length}</Label>
              <Slider value={[length]} onValueChange={([val]) => setLength(val)} min={8} max={64} step={1} />
            </div>
            <div className="flex items-center justify-around">
              <div className="flex items-center space-x-2">
                <Checkbox id="uppercase" checked={includeUppercase} onCheckedChange={setIncludeUppercase} />
                <Label htmlFor="uppercase">ABC</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="numbers" checked={includeNumbers} onCheckedChange={setIncludeNumbers} />
                <Label htmlFor="numbers">123</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="symbols" checked={includeSymbols} onCheckedChange={setIncludeSymbols} />
                <Label htmlFor="symbols">#$&</Label>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}