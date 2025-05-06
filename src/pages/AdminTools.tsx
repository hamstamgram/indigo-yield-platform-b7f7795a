
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const AdminTools = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const initializeAssets = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('init-crypto-assets');
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Assets initialized",
        description: "Cryptocurrency assets have been added to the database.",
      });
      
      console.log('Init assets response:', data);
    } catch (error) {
      console.error('Error initializing assets:', error);
      toast({
        title: "Initialization failed",
        description: "Could not initialize cryptocurrency assets.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Tools</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Initialize Crypto Assets</CardTitle>
          <CardDescription>
            Add or update the cryptocurrency assets in the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={initializeAssets} 
            disabled={loading}
          >
            {loading ? "Initializing..." : "Initialize Assets"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTools;
