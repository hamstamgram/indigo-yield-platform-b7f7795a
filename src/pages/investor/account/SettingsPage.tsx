import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Settings, Moon, Sun } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { SentryTestButton } from '@/components/SentryTestButton';

const SettingsPage = () => {
  const [theme, setTheme] = useState('system');
  const [language, setLanguage] = useState('en');
  const [saveLoading, setSaveLoading] = useState(false);
  const { toast } = useToast();

  const handleSaveSettings = () => {
    setSaveLoading(true);
    
    // Simulate saving settings
    setTimeout(() => {
      setSaveLoading(false);
      toast({
        title: 'Settings saved',
        description: 'Your preferences have been updated.',
      });
    }, 800);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Settings</h1>
      
      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="mb-4 bg-gray-100 dark:bg-gray-800">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="developer">Developer</TabsTrigger>
        </TabsList>
        
        <TabsContent value="appearance">
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-xl">Appearance</CardTitle>
              <CardDescription>Customize how the dashboard looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="theme" className="text-sm font-medium">Theme</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant={theme === 'light' ? 'default' : 'outline'} 
                    className="justify-start"
                    onClick={() => setTheme('light')}
                  >
                    <Sun className="h-4 w-4 mr-2" />
                    Light
                  </Button>
                  <Button 
                    variant={theme === 'dark' ? 'default' : 'outline'} 
                    className="justify-start"
                    onClick={() => setTheme('dark')}
                  >
                    <Moon className="h-4 w-4 mr-2" />
                    Dark
                  </Button>
                  <Button 
                    variant={theme === 'system' ? 'default' : 'outline'} 
                    className="justify-start"
                    onClick={() => setTheme('system')}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    System
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="language" className="text-sm font-medium">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language" className="w-full sm:w-[280px]">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Reduce Animations</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Minimize animations for better performance
                  </p>
                </div>
                <Switch />
              </div>
              
              <Button 
                className="w-full sm:w-auto"
                onClick={handleSaveSettings}
                disabled={saveLoading}
              >
                {saveLoading ? 'Saving...' : 'Save Appearance Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preferences">
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-xl">Preferences</CardTitle>
              <CardDescription>Customize your investment dashboard experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Dashboard Timeframe</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Default timeframe for analytics
                  </p>
                </div>
                <Select defaultValue="7d">
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24 Hours</SelectItem>
                    <SelectItem value="7d">7 Days</SelectItem>
                    <SelectItem value="30d">30 Days</SelectItem>
                    <SelectItem value="90d">90 Days</SelectItem>
                    <SelectItem value="1y">1 Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Hide Portfolio Values</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Mask your portfolio values for privacy
                  </p>
                </div>
                <Switch />
              </div>
              
              <Button 
                className="w-full sm:w-auto" 
                onClick={handleSaveSettings}
                disabled={saveLoading}
              >
                {saveLoading ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="developer">
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-xl">Developer Tools</CardTitle>
              <CardDescription>Test monitoring and debugging features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sentry Test Component */}
              <SentryTestButton />
              
              <Separator />
              
              <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
                <h4 className="font-medium mb-2">Environment Information</h4>
                <div className="text-sm space-y-1 font-mono">
                  <p>Mode: {import.meta.env.MODE}</p>
                  <p>Version: {import.meta.env.VITE_APP_VERSION || '1.0.0'}</p>
                  <p>Build: {import.meta.env.PROD ? 'Production' : 'Development'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
