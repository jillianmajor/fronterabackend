import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub;

    // Service client for admin operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (req.method === 'POST') {
      // UPLOAD
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const category = formData.get('category') as string || 'general';
      const orgId = formData.get('org_id') as string || null;
      const ownerId = formData.get('owner_id') as string || userId;
      const roleVisibility = formData.get('role_visibility') as string || 'admin';

      if (!file) {
        return new Response(JSON.stringify({ error: 'No file provided' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return new Response(JSON.stringify({ error: 'File too large. Max 20MB.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return new Response(JSON.stringify({ error: `File type '${file.type}' not allowed. Allowed: PDF, PNG, JPG, DOC, DOCX.` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate extension
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return new Response(JSON.stringify({ error: `File extension '${ext}' not allowed.` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Build storage path: org_id/user_id/timestamp_filename
      const folder = orgId || 'unassigned';
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${folder}/${userId}/${timestamp}_${safeName}`;

      // Upload to private bucket
      const { error: uploadError } = await serviceClient.storage
        .from('secure-documents')
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        return new Response(JSON.stringify({ error: 'Upload failed: ' + uploadError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Save metadata
      const visibilityArray = roleVisibility.split(',').map(r => r.trim());
      const { data: docRecord, error: dbError } = await serviceClient
        .from('documents')
        .insert({
          file_name: safeName,
          original_filename: file.name,
          storage_path: storagePath,
          mime_type: file.type,
          file_size: file.size,
          bucket: 'secure-documents',
          uploader_id: userId,
          owner_id: ownerId,
          org_id: orgId,
          role_visibility: visibilityArray,
          category,
          created_by: userId,
        })
        .select()
        .single();

      if (dbError) {
        return new Response(JSON.stringify({ error: 'Failed to save metadata: ' + dbError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Audit log
      await serviceClient.rpc('log_audit', {
        _user_id: userId,
        _action: 'file_upload',
        _resource_type: 'document',
        _resource_id: docRecord.id,
        _details: { file_name: file.name, category, org_id: orgId },
      });

      return new Response(JSON.stringify({ success: true, document: docRecord }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (req.method === 'DELETE') {
      const { document_id } = await req.json();
      if (!document_id) {
        return new Response(JSON.stringify({ error: 'document_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check ownership or admin
      const { data: doc } = await supabase
        .from('documents')
        .select('*')
        .eq('id', document_id)
        .single();

      if (!doc) {
        return new Response(JSON.stringify({ error: 'Document not found or access denied' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Delete from storage
      await serviceClient.storage.from('secure-documents').remove([doc.storage_path]);

      // Delete metadata
      await serviceClient.from('documents').delete().eq('id', document_id);

      // Audit
      await serviceClient.rpc('log_audit', {
        _user_id: userId,
        _action: 'file_delete',
        _resource_type: 'document',
        _resource_id: document_id,
        _details: { file_name: doc.original_filename },
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
