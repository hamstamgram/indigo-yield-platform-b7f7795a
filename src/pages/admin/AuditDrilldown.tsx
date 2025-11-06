import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AuditEvent } from '@/types/common';

const AuditDrilldown = () => {
  const { id } = useParams<{ id: string }>();
  const [auditEvent, setAuditEvent] = useState<AuditEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchAuditEvent(id);
    }
  }, [id]);

  const fetchAuditEvent = async (eventId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      if (data) {
        const transformedEvent: AuditEvent = {
          event_id: data.id,
          user_id: data.actor_user || '',
          actor_user: data.actor_user || '',
          entity: data.entity || '',
          entity_id: data.entity_id || '',
          operation: data.action || '',
          source_table: data.entity || '',
          old_values: (typeof data.old_values === 'object' && data.old_values !== null) ? data.old_values as Record<string, any> : {},
          new_values: (typeof data.new_values === 'object' && data.new_values !== null) ? data.new_values as Record<string, any> : {},
          meta: (typeof data.meta === 'object' && data.meta !== null) ? data.meta as Record<string, any> : {},
          created_at: data.created_at
        };
        setAuditEvent(transformedEvent);
      }
    } catch (error) {
      console.error('Error fetching audit event:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!auditEvent) {
    return <div className="p-6">Audit event not found</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Audit Event Details</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Event Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-medium">Event ID:</label>
              <p className="text-muted-foreground">{auditEvent.event_id}</p>
            </div>
            <div>
              <label className="font-medium">Operation:</label>
              <Badge variant="outline">{auditEvent.operation}</Badge>
            </div>
            <div>
              <label className="font-medium">Entity:</label>
              <p className="text-muted-foreground">{auditEvent.entity}</p>
            </div>
            <div>
              <label className="font-medium">Entity ID:</label>
              <p className="text-muted-foreground">{auditEvent.entity_id}</p>
            </div>
            <div>
              <label className="font-medium">Actor:</label>
              <p className="text-muted-foreground">{auditEvent.actor_user}</p>
            </div>
            <div>
              <label className="font-medium">Timestamp:</label>
              <p className="text-muted-foreground">
                {new Date(auditEvent.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          {Object.keys(auditEvent.old_values).length > 0 && (
            <div>
              <label className="font-medium">Old Values:</label>
              <pre className="mt-2 p-3 bg-muted rounded text-sm overflow-auto">
                {JSON.stringify(auditEvent.old_values, null, 2)}
              </pre>
            </div>
          )}

          {Object.keys(auditEvent.new_values).length > 0 && (
            <div>
              <label className="font-medium">New Values:</label>
              <pre className="mt-2 p-3 bg-muted rounded text-sm overflow-auto">
                {JSON.stringify(auditEvent.new_values, null, 2)}
              </pre>
            </div>
          )}

          {Object.keys(auditEvent.meta).length > 0 && (
            <div>
              <label className="font-medium">Metadata:</label>
              <pre className="mt-2 p-3 bg-muted rounded text-sm overflow-auto">
                {JSON.stringify(auditEvent.meta, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditDrilldown;