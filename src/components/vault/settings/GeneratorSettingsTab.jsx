import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Copy } from 'lucide-react';

export default function GeneratorSettingsTab({ settings, onSettingChange }) {
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [length, setLength] = useState(settings.generatorLength || 16);
  const [includeUppercase, setIncludeUppercase] = useState(settings.generatorIncludeUppercase !== false);
  const [includeLowercase, setIncludeLowercase] = useState(settings.generatorIncludeLowercase !== false);
  const [includeNumbers, setIncludeNumbers] = useState(settings.generatorIncludeNumbers !== false);
  const [includeSymbols, setIncludeSymbols] = useState(settings.generatorIncludeSymbols !== false);

  const generatePassword = () => {
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numberChars = '0123456789';
    const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let charset = '';
    if (includeLowercase) charset += lowercaseChars;
    if (includeUppercase) charset += uppercaseChars;
    if (includeNumbers) charset += numberChars;
    if (includeSymbols) charset += symbolChars;

    if (!charset) {
      setGeneratedPassword('Select at least one character type');
      return;
    }

    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setGeneratedPassword(password);
  };

  useEffect(() => {
    generatePassword();
  }, [length, includeUppercase, includeLowercase, includeNumbers, includeSymbols]);
  
  const handleSettingChange = (key, value) => {
    onSettingChange(key, value);
    switch(key) {
        case 'generatorLength': setLength(value); break;
        case 'generatorIncludeUppercase': setIncludeUppercase(value); break;
        case 'generatorIncludeLowercase': setIncludeLowercase(value); break;
        case 'generatorIncludeNumbers': setIncludeNumbers(value); break;
        case 'generatorIncludeSymbols': setIncludeSymbols(value); break;
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword);
    alert('Password copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg">
        <Label>Generated Password</Label>
        <div className="flex items-center gap-2 mt-1">
          <Input readOnly value={generatedPassword} className="font-mono" />
          <Button variant="outline" size="icon" onClick={copyToClipboard}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="space-y-4 p-4 border rounded-lg">
        <div className="space-y-2">
            <div className="flex justify-between">
                <Label htmlFor="length">Password Length</Label>
                <span className="font-semibold">{length}</span>
            </div>
            <Slider
                id="length"
                min={4}
                max={32}
                step={1}
                value={[length]}
                onValueChange={(value) => handleSettingChange('generatorLength', value[0])}
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
                <Switch id="uppercase" checked={includeUppercase} onCheckedChange={(c) => handleSettingChange('generatorIncludeUppercase', c)} />
                <Label htmlFor="uppercase">Uppercase (A-Z)</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Switch id="lowercase" checked={includeLowercase} onCheckedChange={(c) => handleSettingChange('generatorIncludeLowercase', c)} />
                <Label htmlFor="lowercase">Lowercase (a-z)</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Switch id="numbers" checked={includeNumbers} onCheckedChange={(c) => handleSettingChange('generatorIncludeNumbers', c)} />
                <Label htmlFor="numbers">Numbers (0-9)</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Switch id="symbols" checked={includeSymbols} onCheckedChange={(c) => handleSettingChange('generatorIncludeSymbols', c)} />
                <Label htmlFor="symbols">Symbols (!@#$)</Label>
            </div>
        </div>
      </div>
    </div>
  );
}