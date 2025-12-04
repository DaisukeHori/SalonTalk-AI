/**
 * Repository Interfaces
 * リポジトリインターフェース定義
 */

import {
  SalonId,
  StaffId,
  SessionId,
  SegmentId,
  AnalysisId,
  SuccessCaseId,
  ReportId,
  StaffRole,
  SessionStatus,
  Embedding,
  IndicatorType,
} from '../valueObjects';
import {
  Salon,
  Staff,
  Session,
  SpeakerSegment,
  AnalysisResult,
  SuccessCase,
  Report,
  TrainingScenario,
  RoleplaySession,
} from '../entities';

/**
 * Base query options
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
}

export interface DateRangeOptions {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Salon Repository Interface
 */
export interface SalonRepository {
  findById(id: SalonId): Promise<Salon | null>;
  create(data: Omit<Salon, 'id' | 'createdAt' | 'updatedAt'>): Promise<Salon>;
  update(id: SalonId, data: Partial<Omit<Salon, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Salon>;
  delete(id: SalonId): Promise<void>;
}

/**
 * Staff Repository Interface
 */
export interface StaffRepository {
  findById(id: StaffId): Promise<Staff | null>;
  findByAuthUserId(authUserId: string): Promise<Staff | null>;
  findBySalonId(salonId: SalonId, options?: QueryOptions): Promise<Staff[]>;
  findActiveByRole(salonId: SalonId, role: StaffRole): Promise<Staff[]>;
  create(data: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>): Promise<Staff>;
  update(id: StaffId, data: Partial<Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Staff>;
  delete(id: StaffId): Promise<void>;
  countBySalonId(salonId: SalonId): Promise<number>;
}

/**
 * Session Repository Interface
 */
export interface SessionRepository {
  findById(id: SessionId): Promise<Session | null>;
  findByStylistId(
    stylistId: StaffId,
    options?: QueryOptions & DateRangeOptions & { status?: SessionStatus }
  ): Promise<Session[]>;
  findBySalonId(
    salonId: SalonId,
    options?: QueryOptions & DateRangeOptions & { status?: SessionStatus }
  ): Promise<Session[]>;
  findActiveByStylistId(stylistId: StaffId): Promise<Session | null>;
  create(data: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<Session>;
  update(id: SessionId, data: Partial<Omit<Session, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Session>;
  countBySalonId(salonId: SalonId, options?: DateRangeOptions): Promise<number>;
}

/**
 * Speaker Segment Repository Interface
 */
export interface SpeakerSegmentRepository {
  findBySessionId(sessionId: SessionId): Promise<SpeakerSegment[]>;
  findBySessionIdAndChunk(sessionId: SessionId, chunkIndex: number): Promise<SpeakerSegment[]>;
  create(data: Omit<SpeakerSegment, 'id' | 'createdAt'>): Promise<SpeakerSegment>;
  createMany(data: Array<Omit<SpeakerSegment, 'id' | 'createdAt'>>): Promise<SpeakerSegment[]>;
  update(id: SegmentId, data: Partial<Omit<SpeakerSegment, 'id' | 'createdAt'>>): Promise<SpeakerSegment>;
  deleteBySessionId(sessionId: SessionId): Promise<void>;
}

/**
 * Analysis Result Repository Interface
 */
export interface AnalysisResultRepository {
  findBySessionId(sessionId: SessionId): Promise<AnalysisResult[]>;
  findBySessionIdAndChunk(sessionId: SessionId, chunkIndex: number): Promise<AnalysisResult[]>;
  findLatestBySessionId(sessionId: SessionId): Promise<AnalysisResult | null>;
  create(data: Omit<AnalysisResult, 'id' | 'createdAt'>): Promise<AnalysisResult>;
  createMany(data: Array<Omit<AnalysisResult, 'id' | 'createdAt'>>): Promise<AnalysisResult[]>;
}

/**
 * Report Repository Interface
 */
export interface ReportRepository {
  findBySessionId(sessionId: SessionId): Promise<Report | null>;
  findByStylistId(
    stylistId: StaffId,
    options?: QueryOptions & DateRangeOptions
  ): Promise<Report[]>;
  findBySalonId(
    salonId: SalonId,
    options?: QueryOptions & DateRangeOptions
  ): Promise<Report[]>;
  create(data: Omit<Report, 'id' | 'generatedAt'>): Promise<Report>;
  getAverageScoreByStylistId(
    stylistId: StaffId,
    options?: DateRangeOptions
  ): Promise<number | null>;
  getAverageScoreBySalonId(
    salonId: SalonId,
    options?: DateRangeOptions
  ): Promise<number | null>;
}

/**
 * Success Case Repository Interface
 */
export interface SuccessCaseRepository {
  findById(id: SuccessCaseId): Promise<SuccessCase | null>;
  findBySalonId(salonId: SalonId, options?: QueryOptions): Promise<SuccessCase[]>;
  findPublic(options?: QueryOptions): Promise<SuccessCase[]>;
  searchByEmbedding(
    embedding: Embedding,
    options: {
      salonId?: SalonId;
      includePublic?: boolean;
      limit?: number;
      threshold?: number;
    }
  ): Promise<Array<SuccessCase & { similarity: number }>>;
  searchByKeywords(
    keywords: string[],
    options: {
      salonId?: SalonId;
      includePublic?: boolean;
      limit?: number;
    }
  ): Promise<SuccessCase[]>;
  create(data: Omit<SuccessCase, 'id' | 'createdAt' | 'updatedAt'>): Promise<SuccessCase>;
  updateEmbedding(id: SuccessCaseId, embedding: Embedding): Promise<SuccessCase>;
  delete(id: SuccessCaseId): Promise<void>;
}

/**
 * Training Scenario Repository Interface
 */
export interface TrainingScenarioRepository {
  findById(id: string): Promise<TrainingScenario | null>;
  findBySalonId(salonId: SalonId | null, options?: QueryOptions): Promise<TrainingScenario[]>;
  findByDifficulty(
    difficulty: TrainingScenario['difficulty'],
    options?: QueryOptions
  ): Promise<TrainingScenario[]>;
  create(data: Omit<TrainingScenario, 'id' | 'createdAt'>): Promise<TrainingScenario>;
  update(id: string, data: Partial<TrainingScenario>): Promise<TrainingScenario>;
  delete(id: string): Promise<void>;
}

/**
 * Roleplay Session Repository Interface
 */
export interface RoleplaySessionRepository {
  findById(id: string): Promise<RoleplaySession | null>;
  findByStaffId(
    staffId: StaffId,
    options?: QueryOptions & { status?: RoleplaySession['status'] }
  ): Promise<RoleplaySession[]>;
  create(data: Omit<RoleplaySession, 'id' | 'startedAt'>): Promise<RoleplaySession>;
  update(id: string, data: Partial<RoleplaySession>): Promise<RoleplaySession>;
}
