import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import {
  jsonResponse,
  handleOptions,
} from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleOptions();
  }

  try {
    // --------------------------------------------------
    // Validate server configuration
    // --------------------------------------------------

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        {
          error: 'Supabase server configuration is missing.',
        },
        500,
      );
    }

    // --------------------------------------------------
    // Get authenticated user
    // --------------------------------------------------

    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return jsonResponse(
        {
          error: 'Unauthorized.',
        },
        401,
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();

    // Admin client
    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

    // Verify token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse(
        {
          error: 'Unauthorized.',
        },
        401,
      );
    }

    // --------------------------------------------------
    // Read request
    // --------------------------------------------------

    const body = await req.json();

    const { report_id } = body;

    if (!report_id) {
      return jsonResponse(
        {
          error: 'report_id is required.',
        },
        400,
      );
    }

    console.log('Delete report request:', {
      report_id,
      user_id: user.id,
    });

    // --------------------------------------------------
    // Find report and verify ownership
    // --------------------------------------------------

    const {
      data: report,
      error: reportError,
    } = await supabase
      .from('medical_reports')
      .select('id, patient_id, file_path, title')
      .eq('id', report_id)
      .eq('patient_id', user.id)
      .single();

    if (reportError || !report) {
      console.error(
        'Report lookup error:',
        reportError?.message,
      );

      return jsonResponse(
        {
          error: 'Report not found or you do not have permission to delete it.',
        },
        404,
      );
    }

    // --------------------------------------------------
    // Delete AI analysis
    // --------------------------------------------------

    const {
      error: analysisDeleteError,
    } = await supabase
      .from('ai_analysis')
      .delete()
      .eq('report_id', report_id);

    if (analysisDeleteError) {
      console.error(
        'AI analysis deletion error:',
        analysisDeleteError.message,
      );

      return jsonResponse(
        {
          error: 'Could not delete the report analysis.',
          details: analysisDeleteError.message,
        },
        500,
      );
    }

    // --------------------------------------------------
    // Delete physical file from Storage
    // --------------------------------------------------

    if (report.file_path) {
      const {
        error: storageError,
      } = await supabase.storage
        .from('reports')
        .remove([report.file_path]);

      if (storageError) {
        console.error(
          'Storage deletion error:',
          storageError.message,
        );

        return jsonResponse(
          {
            error: 'Could not delete the uploaded report file.',
            details: storageError.message,
          },
          500,
        );
      }
    }

    // --------------------------------------------------
    // Delete medical report
    // --------------------------------------------------

    const {
      error: deleteError,
    } = await supabase
      .from('medical_reports')
      .delete()
      .eq('id', report_id)
      .eq('patient_id', user.id);

    if (deleteError) {
      console.error(
        'Medical report deletion error:',
        deleteError.message,
      );

      return jsonResponse(
        {
          error: 'Could not delete the report.',
          details: deleteError.message,
        },
        500,
      );
    }

    console.log(
      `Report deleted successfully: ${report_id}`,
    );

    return jsonResponse({
      success: true,
      message: 'Report deleted successfully.',
      report_id,
    });

  } catch (error) {
    console.error(
      'Delete report function error:',
      error instanceof Error
        ? error.stack || error.message
        : error,
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error.',
      },
      500,
    );
  }
});