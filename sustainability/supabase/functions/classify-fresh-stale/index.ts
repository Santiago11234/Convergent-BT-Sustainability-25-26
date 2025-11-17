// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.223.0/http/server.ts';

interface ClassificationRequest {
  imageUrl: string;
}

/**
 * Fresh/Stale Classification Edge Function
 * 
 * This function calls the fresh-stale classifier model from:
 * https://github.com/poxiewix9/fresh-stale-classifier
 * 
 * TODO: Integrate with the actual model API endpoint
 * Options:
 * 1. Deploy the model as a separate API (Flask/FastAPI) and call it here
 * 2. Use Hugging Face Inference API if the model is uploaded there
 * 3. Convert model to ONNX and run inference here (more complex)
 * 
 * For now, this is a placeholder that simulates the classification.
 */
serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const payload = (await req.json()) as ClassificationRequest;

    if (!payload.imageUrl) {
      return new Response(JSON.stringify({ error: 'imageUrl is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the model API URL from environment variable
    // Set this using: supabase secrets set MODEL_API_URL=https://your-api.railway.app
    const MODEL_API_URL = Deno.env.get('MODEL_API_URL') || '';

    if (!MODEL_API_URL) {
      console.error('MODEL_API_URL not set. Please set it using: supabase secrets set MODEL_API_URL=https://your-api.railway.app');
      // Fallback to placeholder for development
      const simulatedIsFresh = Math.random() > 0.3;
      const simulatedConfidence = 0.75 + Math.random() * 0.2;
      return new Response(JSON.stringify({
        isFresh: simulatedIsFresh,
        confidence: simulatedConfidence,
        model: 'fresh-stale-classifier',
        note: 'MODEL_API_URL not configured. Using placeholder response.',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Ensure URL doesn't have trailing slash
      const apiUrl = MODEL_API_URL.endsWith('/') ? MODEL_API_URL.slice(0, -1) : MODEL_API_URL;
      const classifyUrl = `${apiUrl}/classify`;
      
      console.log('Calling model API:', classifyUrl);
      console.log('Image URL:', payload.imageUrl);

      // Call the deployed model API
      const apiResponse = await fetch(classifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: payload.imageUrl,
        }),
      });

      console.log('API Response status:', apiResponse.status);
      
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('API Error response:', errorText);
        throw new Error(`Model API returned ${apiResponse.status}: ${errorText}`);
      }

      const apiData = await apiResponse.json();
      console.log('API Response data:', apiData);

      const responseBody = {
        isFresh: apiData.isFresh ?? false,
        confidence: typeof apiData.confidence === 'number' ? apiData.confidence : 0,
        model: apiData.model || 'fresh-stale-classifier',
      };

      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (apiError) {
      console.error('Model API error:', apiError);
      // Return error with details for debugging
      return new Response(JSON.stringify({ 
        error: 'Classification failed',
        details: apiError instanceof Error ? apiError.message : 'Unknown error',
        modelApiUrl: MODEL_API_URL
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('classify-fresh-stale error', error);
    return new Response(JSON.stringify({ error: 'Classification failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

