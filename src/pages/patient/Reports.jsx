import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { extractTextFromImage } from '../../lib/ocr';
import { analyzeReport } from '../../lib/ai';
import { enforceGuardrails } from '../../lib/aiGuardrails';

export default function Reports() {
  const { profile, user } = useAuth();
  const { t, locale } = useLocale();
  const patientId = profile?.id || user?.id;
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);


  useEffect(() => {
    if (!patientId) return;
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function loadReports() {
    const { data, error } = await supabase
      .from('medical_reports')
      .select('*, ai_analysis(*)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (!error) {
      setReports(data || []);
      if (data?.length && !selected) setSelected(data[0]);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    if (file.size > 10 * 1024 * 1024) {
      setError('Please choose a report smaller than 10 MB.');
      e.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Please upload a PDF or image report.');
      e.target.value = '';
      return;
    }
    setUploading(true);
    setAnalyzing(true);

    try {
      // 1. Upload file to Supabase Storage bucket "reports"
      if (!patientId) throw new Error('Your patient profile is still loading. Please try again in a moment.');
      const filePath = `${patientId}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('reports')
        .upload(filePath, file);
      if (uploadErr) throw uploadErr;
      // 2. Insert the record. Files remain private and are served through signed URLs.
      const { data: reportRow, error: insertErr } = await supabase
        .from('medical_reports')
        .insert([{ patient_id: patientId, title: file.name, file_path: filePath }])
        .select()
        .single();
      if (insertErr) throw insertErr;

      // OCR runs locally for images. PDFs are still stored immediately and
      // can be reviewed while server-side PDF extraction is configured.
      if (file.type.startsWith('image/')) {
        try {
          const text = await extractTextFromImage(file);
          await supabase
            .from('medical_reports')
            .update({ extracted_text: text, status: 'ocr_complete' })
            .eq('id', reportRow.id);

          const aiResult = await analyzeReport(text, locale);
          const guarded = enforceGuardrails(aiResult, locale);
          const { error: analysisError } = await supabase.from('ai_analysis').insert([
            {
              report_id: reportRow.id,
              summary: guarded.explanation,
              flagged_values: aiResult.flagged_values || [],
              next_steps: aiResult.next_steps || [],
              disclaimer: guarded.disclaimer,
              is_emergency: guarded.emergency,
              raw_json: { flagged_values: aiResult.flagged_values || [], next_steps: aiResult.next_steps || [] },
            },
          ]);
          if (analysisError) throw analysisError;
          setAnalysis(guarded);
        } catch (analysisError) {
          setError(`Report uploaded, but its AI explanation could not be completed: ${analysisError.message}`);
        }
      } else {
        setError('Report uploaded. PDF analysis will be available after server-side PDF extraction is configured.');
      }
      await loadReports();
    } catch (err) {
      setError(err.message || t('error'));
    } finally {
      setUploading(false);
      setAnalyzing(false);
      e.target.value = '';
    }
  }

  function selectReport(r) {
    setSelected(r);
    if (r?.ai_analysis?.length) {
      const a = r.ai_analysis[0];
      setAnalysis({
        explanation: a.summary,
        disclaimer: a.disclaimer,
        emergency: a.is_emergency,
        emergencyMessage: a.is_emergency ? t('emergency') : '',
        flagged: a.flagged_values || [],
        nextSteps: a.next_steps || [],
      });
    } else {
      setAnalysis(null);
    }
  }
//   async function handleDeleteReport(report) {
//   if (!report?.id) return;

//   const confirmed = window.confirm(
//     `Are you sure you want to permanently delete "${report.title || 'this report'}"?\n\n` +
//     'The uploaded file, extracted text, and AI analysis will also be deleted.\n\n' +
//     'This action cannot be undone.',
//   );

//   if (!confirmed) return;

//   setError('');

//   try {
//     const { data, error: deleteError } =
//       await supabase.functions.invoke(
//         'delete-report',
//         {
//           body: {
//             report_id: report.id,
//           },
//         },
//       );

//     if (deleteError) {
//       throw new Error(
//         deleteError.message ||
//           'Could not delete the report.',
//       );
//     }

//     if (!data?.success) {
//       throw new Error(
//         data?.error ||
//           'Could not delete the report.',
//       );
//     }

//     // Remove from local state immediately
//     setReports((current) =>
//       current.filter(
//         (item) => item.id !== report.id,
//       ),
//     );

//     // If the deleted report was selected,
//     // select another report or clear the view.
//     if (selected?.id === report.id) {
//       const remainingReports = reports.filter(
//         (item) => item.id !== report.id,
//       );

//       if (remainingReports.length > 0) {
//         selectReport(remainingReports[0]);
//       } else {
//         setSelected(null);
//         setAnalysis(null);
//       }
//     }

//   } catch (err) {
//     console.error(
//       'Delete report error:',
//       err,
//     );

//     setError(
//       err instanceof Error
//         ? err.message
//         : 'Could not delete the report.',
//     );
//   }
//  }
async function handleDeleteReport(report) {
  if (!report?.id) return;

  setDeleting(true);
  setError('');

  try {
    const { data, error: deleteError } =
      await supabase.functions.invoke(
        'delete-report',
        {
          body: {
            report_id: report.id,
          },
        },
      );

    if (deleteError) {
      throw new Error(
        deleteError.message ||
          'Could not delete the report.',
      );
    }

    if (!data?.success) {
      throw new Error(
        data?.error ||
          'Could not delete the report.',
      );
    }

    setReports((current) =>
      current.filter(
        (item) => item.id !== report.id,
      ),
    );

    if (selected?.id === report.id) {
      const remainingReports = reports.filter(
        (item) => item.id !== report.id,
      );

      if (remainingReports.length > 0) {
        selectReport(remainingReports[0]);
      } else {
        setSelected(null);
        setAnalysis(null);
      }
    }

    setDeleteTarget(null);

  } catch (err) {
    console.error('Delete report error:', err);

    setError(
      err instanceof Error
        ? err.message
        : 'Could not delete the report.',
    );
  } finally {
    setDeleting(false);
  }
}
  async function explainSelectedReport() {
    if (!selected) return;
    setError('');
    setAnalyzing(true);
    try {
      let extractedText = selected.extracted_text || '';
      if (!extractedText.trim()) {
        try {
          const { data, error: ocrError } = await supabase.functions.invoke('ocr', {
            body: { report_id: selected.id, file_path: selected.file_path },
          });
          if (ocrError || data?.error) throw new Error(ocrError?.message || data?.error || 'Could not extract report text.');
          extractedText = data.extracted_text || '';
        } catch (ocrError) {
          const fileType = selected.title?.toLowerCase().endsWith('.pdf') ? 'PDF extraction' : 'Image text extraction';
          throw new Error(`${fileType} failed: ${ocrError.message || 'The OCR service is unavailable.'}`);
        }
      }
      if (!extractedText.trim()) throw new Error('No readable text was found in this report.');

      let aiResult;
      try {
        aiResult = await analyzeReport(extractedText, locale);
      } catch (analysisServiceError) {
        throw new Error(`AI explanation service failed: ${analysisServiceError.message || 'The service is unavailable.'}`);
      }
      const guarded = enforceGuardrails(aiResult, locale);
      const { error: analysisError } = await supabase.from('ai_analysis').insert([
        {
          report_id: selected.id,
          summary: guarded.explanation,
          flagged_values: aiResult.flagged_values || [],
          next_steps: aiResult.next_steps || [],
          disclaimer: guarded.disclaimer,
          is_emergency: guarded.emergency,
          raw_json: { flagged_values: aiResult.flagged_values || [], next_steps: aiResult.next_steps || [] },
        },
      ]);
      if (analysisError) throw analysisError;

      const { data: refreshed, error: refreshError } = await supabase
        .from('medical_reports')
        .select('*, ai_analysis(*)')
        .eq('id', selected.id)
        .single();
      if (refreshError) throw refreshError;
      setReports((current) => current.map((report) => (report.id === refreshed.id ? refreshed : report)));
      selectReport(refreshed);
    } catch (err) {
      setError(`Could not explain this report: ${err.message || t('error')}`);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('reports')}</h1>
        <div>
          <input
            type="file"
            accept="image/*,.pdf"
            id="report-upload"
            className="hidden"
            onChange={handleUpload}
          />
          <label htmlFor="report-upload" className="btn-primary cursor-pointer">
            {uploading ? t('loading') : t('uploadReport')}
          </label>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 text-red-700 text-sm p-3">{error}</div>}

      {analyzing && (
        <div className="rounded-lg bg-primary-50 text-primary-700 text-sm p-4">
          Processing: extracting text with OCR, then generating AI explanation...
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report list */}
        <div className="card lg:col-span-1">
          <h2 className="text-lg font-semibold mb-3">{t('reports')}</h2>
          {reports.length === 0 ? (
            <p className="text-slate-500 text-sm">{t('noData')}.</p>
          ) : (
            <ul className="space-y-2">
              {reports.map((r) => (
  <li key={r.id}>
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
        selected?.id === r.id
          ? 'border-primary-500 bg-primary-50'
          : 'border-slate-200 hover:bg-slate-50'
      }`}
    >
      {/* Report selection */}
      <button
        type="button"
        onClick={() => selectReport(r)}
        className="flex-1 min-w-0 text-left"
      >
        <span className="font-medium block truncate">
          {r.title || 'Untitled'}
        </span>

        <span className="block text-xs text-slate-500 mt-1">
          {new Date(
            r.created_at,
          ).toLocaleDateString()}
        </span>
      </button>

      {/* Delete */}
      <button
        type="button"
        onClick={() => setDeleteTarget(r)}
        // onClick={() => handleDeleteReport(r)}
        title="Delete report"
        aria-label={`Delete ${r.title || 'report'}`}
        className="shrink-0 p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition"
      >
        🗑️
      </button>
      {deleteTarget && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget && !deleting) {
        setDeleteTarget(null);
      }
    }}
  >
    <div
      className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-report-title"
    >
      {/* Warning icon */}
      <div className="flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 text-xl">
          ⚠️
        </div>
      </div>

      {/* Title */}
      <h2
        id="delete-report-title"
        className="mt-4 text-center text-xl font-semibold text-slate-800"
      >
        Delete report?
      </h2>

      {/* Message */}
      <p className="mt-2 text-center text-sm text-slate-500">
        Are you sure you want to permanently delete this
        report?
      </p>

      {/* Report name */}
      <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3">
        <p className="truncate text-sm font-medium text-slate-700">
          {deleteTarget.title || 'Untitled report'}
        </p>
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">
        The uploaded file, extracted text, and AI analysis
        will also be deleted. This action cannot be undone.
      </p>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          disabled={deleting}
          onClick={() => setDeleteTarget(null)}
          className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={deleting}
          onClick={() => handleDeleteReport(deleteTarget)}
          className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? 'Deleting...' : 'Delete report'}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  </li>
))}
            </ul>
          )}
        </div>

        {/* Analysis view */}
        <div className="lg:col-span-2 space-y-4">
          {analysis ? (
            <>
              {analysis.emergency && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="font-semibold text-red-700">{analysis.emergencyMessage}</p>
                </div>
              )}
              <div className="card">
                <h2 className="text-lg font-semibold mb-2">{t('summary')}</h2>
                <p className="text-slate-700 whitespace-pre-wrap">{analysis.explanation}</p>
                <p className="mt-4 text-sm text-slate-500 italic">{analysis.disclaimer}</p>
              </div>
              {analysis.nextSteps?.length > 0 && (
                <div className="card">
                  <h2 className="text-lg font-semibold mb-2">{t('nextSteps')}</h2>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    {analysis.nextSteps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="card">
              <h2 className="text-lg font-semibold text-slate-800">Report explanation</h2>
              <p className="mt-2 text-sm text-slate-500">
                {selected ? 'Create a plain-language explanation for the selected report.' : `${t('noData')}. Select or upload a report to begin.`}
              </p>
              {selected && (
                <button type="button" onClick={explainSelectedReport} disabled={analyzing} className="btn-primary mt-5">
                  {analyzing ? 'Preparing explanation...' : 'Explain report'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
