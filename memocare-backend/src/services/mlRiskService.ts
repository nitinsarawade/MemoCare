import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

export interface ExtractedFeatures {
  pauseCount: number;
  avgPauseDurationMs: number;
  speechRateWpm: number;
  fillerWordCount: number;
  wordFindingDifficultyScore: number; // 0-1
  coherenceScore: number; // 0-1
  rawFeatureJson: Record<string, unknown>;
  transcriptText?: string; // populated by HttpFeatureExtractor (real Whisper transcript)
}

export interface RiskScoreResult {
  riskScore: number; // 0-100
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'UNKNOWN';
  modelVersion: string;
  modelRawResponse: Record<string, unknown>;
}

/**
 * Stage 1: feature extraction from a raw audio file.
 * In production this would call a speech-processing pipeline
 * (e.g. a Python microservice running WhisperX/Praat/openSMILE).
 * The contract (object key in, ExtractedFeatures out) is what a real
 * implementation must satisfy.
 */
export interface FeatureExtractor {
  extract(storageKey: string): Promise<ExtractedFeatures>;
}

/**
 * Stage 2: turns extracted features into a risk score. This is the
 * "pluggable ML service" called out in the spec — swap StubMlRiskService
 * for an HttpMlRiskService that POSTs to a real model endpoint without
 * changing any calling code.
 */
export interface MlRiskService {
  score(features: ExtractedFeatures): Promise<RiskScoreResult>;
}

class StubFeatureExtractor implements FeatureExtractor {
  async extract(_storageKey: string): Promise<ExtractedFeatures> {
    // Deterministic-ish pseudo-random stub so local dev/tests are stable
    // without a real audio pipeline. Replace entirely in production.
    const pauseCount = Math.floor(Math.random() * 12);
    const avgPauseDurationMs = 300 + Math.floor(Math.random() * 900);
    const speechRateWpm = 90 + Math.floor(Math.random() * 60);
    const fillerWordCount = Math.floor(Math.random() * 8);
    const wordFindingDifficultyScore = Math.random();
    const coherenceScore = Math.random();
    return {
      pauseCount,
      avgPauseDurationMs,
      speechRateWpm,
      fillerWordCount,
      wordFindingDifficultyScore,
      coherenceScore,
      rawFeatureJson: { pauseCount, avgPauseDurationMs, speechRateWpm, fillerWordCount },
    };
  }
}

class StubMlRiskService implements MlRiskService {
  async score(features: ExtractedFeatures): Promise<RiskScoreResult> {
    // Simple weighted heuristic standing in for a trained model.
    const score =
      features.wordFindingDifficultyScore * 40 +
      (1 - features.coherenceScore) * 30 +
      Math.min(features.fillerWordCount / 10, 1) * 15 +
      Math.min(features.avgPauseDurationMs / 1500, 1) * 15;

    const riskScore = Math.round(Math.min(100, Math.max(0, score)));
    const riskLevel = riskScore >= 66 ? 'HIGH' : riskScore >= 33 ? 'MODERATE' : 'LOW';

    return {
      riskScore,
      riskLevel,
      modelVersion: 'stub-heuristic-v1',
      modelRawResponse: { formula: 'weighted-heuristic', inputs: features },
    };
  }
}

/**
 * Real feature extraction: sends the actual audio file to the local
 * Python Whisper microservice (see /speech-analysis-service) and
 * returns the real transcript + real acoustic/linguistic features it
 * computes, instead of the random StubFeatureExtractor numbers.
 *
 * Only supports the 'local' storage driver today (reads the file
 * straight off disk) — an S3-backed deployment would instead pass the
 * object's signed URL, or stream the object body, to the Python
 * service.
 */
class HttpFeatureExtractor implements FeatureExtractor {
  async extract(storageKey: string): Promise<ExtractedFeatures> {
    if (env.storage.driver !== 'local') {
      throw new Error('HttpFeatureExtractor currently only supports STORAGE_DRIVER=local');
    }

    const fullPath = path.join(env.storage.localPath, storageKey);
    const buffer = fs.readFileSync(fullPath);

    const form = new FormData();
    form.append('file', new Blob([buffer]), path.basename(storageKey));

    const res = await fetch(env.featureExtraction.url, { method: 'POST', body: form });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Speech analysis service returned ${res.status}: ${body}`);
    }

    const data = (await res.json()) as ExtractedFeatures & { transcriptText: string };
    return data;
  }
}

class HttpMlRiskService implements MlRiskService {
  async score(features: ExtractedFeatures): Promise<RiskScoreResult> {
    const res = await fetch(env.mlService.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.mlService.apiKey}` },
      body: JSON.stringify({ features }),
    });
    if (!res.ok) throw new Error(`ML service returned ${res.status}`);
    const body = (await res.json()) as RiskScoreResult;
    return body;
  }
}

export const featureExtractor: FeatureExtractor =
  env.featureExtraction.mode === 'http' ? new HttpFeatureExtractor() : new StubFeatureExtractor();
export const mlRiskService: MlRiskService = env.mlService.mode === 'http' ? new HttpMlRiskService() : new StubMlRiskService();
