// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.223.0/http/server.ts';

interface VerificationRequestImage {
  angle: string;
  url: string;
}

interface VerificationRequestVideo {
  url: string;
  storagePath?: string;
  durationMs?: number | null;
}

interface VerificationRequestBody {
  productId?: string;
  claimedName?: string;
  claimedCategory?: string;
  images: VerificationRequestImage[];
  video?: VerificationRequestVideo | null;
  captureMethod?: string;
}

const REQUIRED_ANGLES = ['front', 'right', 'back', 'left', 'top', 'bottom'];

const validatePayload = (payload: VerificationRequestBody) => {
  if (!payload || !Array.isArray(payload.images) || payload.images.length === 0) {
    return 'No images provided.';
  }

  const missingAngles = REQUIRED_ANGLES.filter(
    (angle) => !payload.images.some((image) => image.angle === angle),
  );

  if (missingAngles.length > 0) {
    return `Missing required perspectives: ${missingAngles.join(', ')}`;
  }

  return null;
};

serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const payload = (await req.json()) as VerificationRequestBody;
    const validationError = validatePayload(payload);

    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Placeholder AI analysis - replace with real model integration.
    const simulatedConfidence = 0.85;
    const simulatedRipeness = 0.78;
    const matchedProduct = payload.claimedName ?? 'produce';

    const responseBody = {
      status: simulatedConfidence > 0.7 ? 'approved' : 'manual_review',
      confidence: simulatedConfidence,
      ripenessScore: simulatedRipeness,
      matchedProduct,
      notes: [
        'AI verification is currently simulated. Integrate real model inference.',
        `Captured ${payload.images.length} images across required angles.`,
        payload.video?.url
          ? `Guided video uploaded: ${payload.video.url}`
          : 'No guided video provided with this verification request.',
      ],
      metadata: {
        claimedCategory: payload.claimedCategory ?? null,
        processedAt: new Date().toISOString(),
        referenceImages: payload.images,
        captureMethod: payload.captureMethod ?? (payload.video?.url ? 'guided_video' : 'manual_photos'),
        video: payload.video ?? null,
      },
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('verify-produce error', error);
    return new Response(JSON.stringify({ error: 'Verification failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

