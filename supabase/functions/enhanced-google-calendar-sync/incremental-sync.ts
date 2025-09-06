// Incremental sync helper functions for enhanced Google Calendar sync

export async function processIncrementalEvent(userId: string, googleEvent: any, supabase: any) {
  try {
    // Check if we have an existing mapping
    const { data: mapping } = await supabase
      .from('google_event_mappings')
      .select('*')
      .eq('google_event_id', googleEvent.id)
      .eq('user_id', userId)
      .single();

    if (!mapping) {
      // New event from Google - create local copy
      await createLocalEventFromGoogle(userId, googleEvent, supabase);
      return null;
    }

    // Event exists - check for conflicts
    const { data: localEntity } = await getLocalEntity(mapping.entity_type, mapping.entity_id, supabase);
    
    if (!localEntity) {
      // Local entity was deleted - remove mapping
      await supabase
        .from('google_event_mappings')
        .delete()
        .eq('id', mapping.id);
      return null;
    }

    // Compare versions to detect conflicts
    const googleUpdated = new Date(googleEvent.updated);
    const localUpdated = new Date(localEntity.updated_at);
    const lastSynced = new Date(mapping.last_synced_at);

    // Check if both have been modified since last sync
    if (googleUpdated > lastSynced && localUpdated > lastSynced) {
      // Conflict detected - both modified independently
      return await createConflictRecord(userId, mapping, localEntity, googleEvent, supabase);
    } else if (googleUpdated > lastSynced) {
      // Only Google modified - update local
      await updateLocalEventFromGoogle(mapping, googleEvent, supabase);
    } else if (localUpdated > lastSynced) {
      // Only local modified - update Google (handled in export phase)
      // For now, just update the mapping timestamp
      await supabase
        .from('google_event_mappings')
        .update({
          local_event_updated: localUpdated.toISOString(),
          last_synced_at: new Date().toISOString()
        })
        .eq('id', mapping.id);
    }

    return null;
  } catch (error) {
    console.error('Process incremental event error:', error);
    return null;
  }
}

export async function handleDeletedEvent(userId: string, googleEventId: string, supabase: any) {
  try {
    // Find the mapping
    const { data: mapping } = await supabase
      .from('google_event_mappings')
      .select('*')
      .eq('google_event_id', googleEventId)
      .eq('user_id', userId)
      .single();

    if (!mapping) return;

    // Check if local entity should be deleted or just unmapped
    const { data: localEntity } = await getLocalEntity(mapping.entity_type, mapping.entity_id, supabase);
    
    if (localEntity) {
      // Ask user preference: delete local or just remove mapping?
      // For now, just remove mapping to preserve local data
      await supabase
        .from('google_event_mappings')
        .delete()
        .eq('id', mapping.id);

      console.log(`Unmapped deleted Google event ${googleEventId} from local ${mapping.entity_type}`);
    }
  } catch (error) {
    console.error('Handle deleted event error:', error);
  }
}

export async function createConflictRecord(userId: string, mapping: any, localEntity: any, googleEvent: any, supabase: any) {
  try {
    const conflict = {
      user_id: userId,
      entity_type: mapping.entity_type,
      entity_id: mapping.entity_id,
      google_event_id: googleEvent.id,
      conflict_type: 'content_modified',
      local_data: localEntity,
      google_data: googleEvent,
    };

    const { data: conflictRecord, error } = await supabase
      .from('sync_conflicts')
      .insert(conflict)
      .select()
      .single();

    if (error) throw error;

    // Log conflict for monitoring
    await supabase
      .from('sync_operations')
      .insert({
        user_id: userId,
        entity_type: mapping.entity_type,
        entity_id: mapping.entity_id,
        operation_type: 'conflict_detection',
        operation_status: 'pending',
        sync_direction: 'bidirectional',
        google_event_id: googleEvent.id,
        conflict_data: { conflict_id: conflictRecord.id }
      });

    console.log(`Created conflict record for ${mapping.entity_type} ${mapping.entity_id}`);
    return conflictRecord;
  } catch (error) {
    console.error('Create conflict record error:', error);
    return null;
  }
}

export async function getLocalEntity(entityType: string, entityId: string, supabase: any) {
  try {
    const { data, error } = await supabase
      .from(entityType === 'schedule_block' ? 'schedule_blocks' : 
           entityType === 'assignment' ? 'assignments' : 
           entityType === 'exam' ? 'exams' : entityType)
      .select('*')
      .eq('id', entityId)
      .single();

    return error ? null : data;
  } catch (error) {
    console.error('Get local entity error:', error);
    return null;
  }
}

export async function updateLocalEventFromGoogle(mapping: any, googleEvent: any, supabase: any) {
  try {
    const entityType = mapping.entity_type;
    const entityId = mapping.entity_id;

    let updateData: any = {};

    // Map Google event fields to local entity fields
    switch (entityType) {
      case 'schedule_block':
        updateData = {
          title: googleEvent.summary || 'Imported Event',
          description: googleEvent.description || null,
          location: googleEvent.location || null,
          updated_at: new Date().toISOString()
        };
        
        if (googleEvent.start?.dateTime) {
          const startDate = new Date(googleEvent.start.dateTime);
          const endDate = new Date(googleEvent.end.dateTime);
          updateData.start_time = startDate.toTimeString().slice(0, 8);
          updateData.end_time = endDate.toTimeString().slice(0, 8);
        }
        break;

      case 'assignment':
        updateData = {
          title: googleEvent.summary || 'Imported Assignment',
          description: googleEvent.description || null,
          updated_at: new Date().toISOString()
        };
        
        if (googleEvent.start?.dateTime) {
          updateData.due_date = googleEvent.start.dateTime;
        }
        break;

      case 'exam':
        updateData = {
          title: googleEvent.summary || 'Imported Exam',
          location: googleEvent.location || null,
          notes: googleEvent.description || null,
          updated_at: new Date().toISOString()
        };
        
        if (googleEvent.start?.dateTime) {
          updateData.exam_date = googleEvent.start.dateTime;
        }
        
        if (googleEvent.end?.dateTime && googleEvent.start?.dateTime) {
          const duration = new Date(googleEvent.end.dateTime).getTime() - new Date(googleEvent.start.dateTime).getTime();
          updateData.duration_minutes = Math.round(duration / (1000 * 60));
        }
        break;
    }

    // Update the local entity
    await supabase
      .from(entityType === 'schedule_block' ? 'schedule_blocks' : 
           entityType === 'assignment' ? 'assignments' : 
           entityType === 'exam' ? 'exams' : entityType)
      .update(updateData)
      .eq('id', entityId);

    // Update mapping
    await supabase
      .from('google_event_mappings')
      .update({
        google_event_updated: new Date(googleEvent.updated).toISOString(),
        last_synced_at: new Date().toISOString(),
        sync_hash: await generateSyncHash(entityType, googleEvent)
      })
      .eq('id', mapping.id);

    console.log(`Updated local ${entityType} from Google event: ${googleEvent.summary}`);
  } catch (error) {
    console.error('Update local from Google error:', error);
    throw error;
  }
}

export async function updateGoogleEventFromLocal(conflict: any, supabase: any) {
  // Implementation for updating Google Calendar from local data
  // This would involve calling the Google Calendar API to update the event
  console.log('Updating Google event from local data:', conflict.entity_id);
  
  // Get access token and update Google event
  // Implementation details would go here...
}

export async function updateBothFromResolvedData(conflict: any, resolvedData: any, supabase: any) {
  // Implementation for updating both local and Google from merged data
  console.log('Updating both systems from resolved data:', conflict.entity_id);
  
  // Update local entity
  await updateLocalEntity(conflict.entity_type, conflict.entity_id, resolvedData, supabase);
  
  // Update Google event
  await updateGoogleEventFromLocal(conflict, supabase);
}

async function updateLocalEntity(entityType: string, entityId: string, data: any, supabase: any) {
  const tableName = entityType === 'schedule_block' ? 'schedule_blocks' : 
                   entityType === 'assignment' ? 'assignments' : 
                   entityType === 'exam' ? 'exams' : entityType;

  await supabase
    .from(tableName)
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', entityId);
}

// Helper function for generating sync hash (referenced but not implemented in the original)
async function generateSyncHash(entityType: string, data: any): Promise<string> {
  const hashData = `${entityType}-${JSON.stringify(data)}-${Date.now()}`;
  return btoa(hashData).slice(0, 32); // Simple hash for demo
}