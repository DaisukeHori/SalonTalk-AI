# 美容室向けリアルタイムコミュニケーション分析システム

## 詳細設計書（内部設計書）

**プロジェクト名**: SalonTalk AI  
**バージョン**: 1.0  
**作成日**: 2025年12月4日  
**作成者**: Revol Corporation  
**機密区分**: 社外秘

---

## 目次

1. [はじめに](#1-はじめに)
2. [クラス設計](#2-クラス設計)
3. [API詳細仕様](#3-api詳細仕様)
4. [シーケンス図詳細](#4-シーケンス図詳細)
5. [状態遷移設計](#5-状態遷移設計)
6. [アルゴリズム詳細設計](#6-アルゴリズム詳細設計)
7. [データベース物理設計](#7-データベース物理設計)
8. [画面項目詳細定義](#8-画面項目詳細定義)
9. [外部連携詳細設計](#9-外部連携詳細設計)
10. [エラーハンドリング詳細](#10-エラーハンドリング詳細)
11. [テスト仕様](#11-テスト仕様)
12. [付録](#12-付録)

---

## 1. はじめに

### 1.1 文書の目的

本詳細設計書は、「SalonTalk AI」システムの内部設計を定義し、実装に必要な詳細仕様を提供することを目的とする。本文書は基本設計書に基づき作成され、開発者が直接コーディングに利用できる詳細度で記述する。

### 1.2 対象読者

| 対象者 | 本文書の利用目的 |
|--------|----------------|
| フロントエンド開発者 | UI実装、状態管理、API連携 |
| バックエンド開発者 | Edge Functions実装、DB操作 |
| AI/ML開発者 | 分析ロジック実装、プロンプト設計 |
| インフラエンジニア | デプロイ設定、監視設定 |
| 品質保証エンジニア | テストケース作成、検証 |

### 1.3 参照文書

| 文書名 | バージョン | 関連箇所 |
|--------|-----------|---------|
| 基本設計書 | v1.0 | 全章 |
| 要件定義書 | v1.0 | 機能要件、非機能要件 |
| 事業企画書 | v3.7 | ビジネス要件 |

### 1.4 設計方針

| 方針 | 説明 | 適用範囲 |
|------|------|---------|
| TypeScript First | 全コードをTypeScriptで記述 | フロントエンド、Edge Functions |
| 関数型アプローチ | 純粋関数、イミュータビリティを優先 | ビジネスロジック |
| ドメイン駆動設計 | ドメインモデルを中心とした設計 | バックエンド |
| コンポーネント駆動開発 | 再利用可能なコンポーネント設計 | フロントエンド |
| テスト駆動開発 | テストを先に書く開発スタイル | 重要ロジック |

---

## 2. クラス設計

### 2.1 ドメインモデル概要

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ドメインモデル概要図                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Bounded Context: Salon                        │   │
│  │                                                                     │   │
│  │   ┌─────────────┐         ┌─────────────┐                          │   │
│  │   │   Salon     │◆────────│   Staff     │                          │   │
│  │   │ (Aggregate) │   1:n   │  (Entity)   │                          │   │
│  │   └─────────────┘         └─────────────┘                          │   │
│  │         │                       │                                   │   │
│  │         │                       │ 1:n                               │   │
│  │         │                       ▼                                   │   │
│  │         │               ┌─────────────┐                             │   │
│  │         │               │  StaffRole  │                             │   │
│  │         │               │(ValueObject)│                             │   │
│  │         │               └─────────────┘                             │   │
│  │         │                                                           │   │
│  └─────────┼───────────────────────────────────────────────────────────┘   │
│            │                                                               │
│  ┌─────────┼───────────────────────────────────────────────────────────┐   │
│  │         │            Bounded Context: Session                       │   │
│  │         │                                                           │   │
│  │         │ 1:n    ┌─────────────┐                                    │   │
│  │         └───────▶│   Session   │◆─────────┬─────────┬─────────┐    │   │
│  │                  │ (Aggregate) │   1:n    │   1:n   │   1:1   │    │   │
│  │                  └─────────────┘          │         │         │    │   │
│  │                        │                  │         │         │    │   │
│  │                        │            ┌─────┴───┐ ┌───┴───┐ ┌───┴──┐│   │
│  │                        │            │Transcript│ │Analysis│ │Report││   │
│  │                        │            │ (Entity) │ │(Entity)│ │(Ent.)││   │
│  │                        │            └─────────┘ └────────┘ └──────┘│   │
│  │                        │                                            │   │
│  │                  ┌─────┴─────┐                                      │   │
│  │                  │  Speaker  │                                      │   │
│  │                  │  Segment  │                                      │   │
│  │                  │ (Entity)  │                                      │   │
│  │                  └───────────┘                                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Bounded Context: Analysis                        │   │
│  │                                                                     │   │
│  │   ┌─────────────┐                                                   │   │
│  │   │AnalysisResult│                                                  │   │
│  │   │ (Aggregate) │                                                   │   │
│  │   └──────┬──────┘                                                   │   │
│  │          │                                                          │   │
│  │    ┌─────┴─────┬─────────────┬─────────────┬─────────────┐         │   │
│  │    │           │             │             │             │         │   │
│  │    ▼           ▼             ▼             ▼             ▼         │   │
│  │ ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │   │
│  │ │TalkRatio│ │Question│ │ Emotion  │ │ Concern  │ │Conversion│      │   │
│  │ │ (VO)   │ │Analysis│ │ Analysis │ │ Keywords │ │  (VO)    │      │   │
│  │ └────────┘ │ (VO)   │ │  (VO)    │ │  (VO)    │ └──────────┘      │   │
│  │            └────────┘ └──────────┘ └──────────┘                    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Bounded Context: SuccessCase                     │   │
│  │                                                                     │   │
│  │   ┌─────────────┐         ┌─────────────┐                          │   │
│  │   │ SuccessCase │◆────────│  Embedding  │                          │   │
│  │   │ (Aggregate) │   1:1   │(ValueObject)│                          │   │
│  │   └─────────────┘         └─────────────┘                          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Bounded Context: Training                        │   │
│  │                                                                     │   │
│  │   ┌─────────────┐         ┌─────────────┐                          │   │
│  │   │  Scenario   │         │  Roleplay   │                          │   │
│  │   │ (Aggregate) │         │  Session    │                          │   │
│  │   └─────────────┘         │ (Aggregate) │                          │   │
│  │                           └──────┬──────┘                          │   │
│  │                                  │                                  │   │
│  │                           ┌──────┴──────┐                          │   │
│  │                           │  Evaluation │                          │   │
│  │                           │(ValueObject)│                          │   │
│  │                           └─────────────┘                          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  凡例:                                                                      │
│  ┌───┐ Aggregate Root    ◆──── 集約関係                                   │
│  └───┘                   ────▶ 参照関係                                    │
│  (VO) = Value Object                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 エンティティ定義

#### 2.2.1 Salon（店舗）

```typescript
// src/domain/entities/Salon.ts

import { SalonId, SalonSettings, Plan } from '../valueObjects';

/**
 * 店舗エンティティ
 * 集約ルート
 */
export interface Salon {
  readonly id: SalonId;
  readonly name: string;
  readonly address: string | null;
  readonly phone: string | null;
  readonly plan: Plan;
  readonly seatsCount: number | null;
  readonly settings: SalonSettings;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * 店舗作成パラメータ
 */
export interface CreateSalonParams {
  name: string;
  address?: string;
  phone?: string;
  plan?: Plan;
  seatsCount?: number;
  settings?: Partial<SalonSettings>;
}

/**
 * 店舗更新パラメータ
 */
export interface UpdateSalonParams {
  name?: string;
  address?: string;
  phone?: string;
  plan?: Plan;
  seatsCount?: number;
  settings?: Partial<SalonSettings>;
}

/**
 * 店舗ドメインサービス
 */
export const SalonDomain = {
  /**
   * 店舗を作成
   */
  create(params: CreateSalonParams): Omit<Salon, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: params.name,
      address: params.address ?? null,
      phone: params.phone ?? null,
      plan: params.plan ?? 'standard',
      seatsCount: params.seatsCount ?? null,
      settings: {
        notification: {
          enablePush: true,
          enableEmail: true,
          concernDetectionAlert: true,
          sessionCompleteAlert: true,
        },
        analysis: {
          idealTalkRatio: 40,
          minQuestionCount: 8,
          concernKeywords: ['乾燥', '広がり', 'パサつき', 'ダメージ', 'うねり', '薄毛', '白髪'],
        },
        display: {
          showRanking: true,
          anonymizeCustomer: false,
        },
        ...params.settings,
      },
    };
  },

  /**
   * プランの機能制限を確認
   */
  canUseFeature(salon: Salon, feature: keyof PlanFeatures): boolean {
    const planFeatures: Record<Plan, PlanFeatures> = {
      standard: {
        aiAnalysis: true,
        realtimeAssist: true,
        report: true,
        training: false,
        apiAccess: false,
        maxSessions: 100,
        maxStaff: 10,
      },
      professional: {
        aiAnalysis: true,
        realtimeAssist: true,
        report: true,
        training: true,
        apiAccess: false,
        maxSessions: 500,
        maxStaff: 30,
      },
      enterprise: {
        aiAnalysis: true,
        realtimeAssist: true,
        report: true,
        training: true,
        apiAccess: true,
        maxSessions: -1, // 無制限
        maxStaff: -1,
      },
    };
    return planFeatures[salon.plan][feature];
  },

  /**
   * スタッフ上限を確認
   */
  canAddStaff(salon: Salon, currentStaffCount: number): boolean {
    const maxStaff = this.getMaxStaff(salon);
    return maxStaff === -1 || currentStaffCount < maxStaff;
  },

  /**
   * 最大スタッフ数を取得
   */
  getMaxStaff(salon: Salon): number {
    const limits: Record<Plan, number> = {
      standard: 10,
      professional: 30,
      enterprise: -1,
    };
    return limits[salon.plan];
  },
};

interface PlanFeatures {
  aiAnalysis: boolean;
  realtimeAssist: boolean;
  report: boolean;
  training: boolean;
  apiAccess: boolean;
  maxSessions: number;
  maxStaff: number;
}
```

#### 2.2.2 Staff（スタッフ）

```typescript
// src/domain/entities/Staff.ts

import { StaffId, SalonId, AuthUserId, StaffRole, StaffSettings } from '../valueObjects';

/**
 * スタッフエンティティ
 */
export interface Staff {
  readonly id: StaffId;
  readonly salonId: SalonId;
  readonly authUserId: AuthUserId;
  readonly name: string;
  readonly email: string;
  readonly role: StaffRole;
  readonly position: string | null;
  readonly joinDate: Date | null;
  readonly profileImageUrl: string | null;
  readonly settings: StaffSettings;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * スタッフ作成パラメータ
 */
export interface CreateStaffParams {
  salonId: SalonId;
  authUserId: AuthUserId;
  name: string;
  email: string;
  role: StaffRole;
  position?: string;
  joinDate?: Date;
}

/**
 * スタッフ更新パラメータ
 */
export interface UpdateStaffParams {
  name?: string;
  role?: StaffRole;
  position?: string;
  joinDate?: Date;
  profileImageUrl?: string;
  settings?: Partial<StaffSettings>;
  isActive?: boolean;
}

/**
 * スタッフドメインサービス
 */
export const StaffDomain = {
  /**
   * スタッフを作成
   */
  create(params: CreateStaffParams): Omit<Staff, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      salonId: params.salonId,
      authUserId: params.authUserId,
      name: params.name,
      email: params.email.toLowerCase(),
      role: params.role,
      position: params.position ?? null,
      joinDate: params.joinDate ?? null,
      profileImageUrl: null,
      settings: {
        notificationPreferences: {
          concernAlert: true,
          sessionComplete: true,
          weeklyReport: true,
        },
        displayPreferences: {
          showScore: true,
          showRanking: true,
        },
      },
      isActive: true,
    };
  },

  /**
   * 権限チェック
   */
  hasPermission(staff: Staff, permission: Permission): boolean {
    const rolePermissions: Record<StaffRole, Permission[]> = {
      owner: [
        'session:create', 'session:read:own', 'session:read:all',
        'report:read:own', 'report:read:all', 'report:export',
        'staff:manage', 'salon:settings',
        'success-case:create', 'success-case:read',
        'training:use', 'dashboard:view', 'analytics:export',
      ],
      manager: [
        'session:create', 'session:read:own', 'session:read:all',
        'report:read:own', 'report:read:all', 'report:export',
        'staff:manage',
        'success-case:create', 'success-case:read',
        'training:use', 'dashboard:view', 'analytics:export',
      ],
      stylist: [
        'session:create', 'session:read:own',
        'report:read:own',
        'success-case:read',
        'training:use',
      ],
      assistant: [
        'session:read:own',
        'report:read:own',
        'success-case:read',
        'training:use',
      ],
    };
    return rolePermissions[staff.role].includes(permission);
  },

  /**
   * 他スタッフのデータにアクセス可能か
   */
  canAccessOtherStaffData(staff: Staff): boolean {
    return staff.role === 'owner' || staff.role === 'manager';
  },

  /**
   * セッション開始可能か
   */
  canStartSession(staff: Staff): boolean {
    return staff.isActive && ['owner', 'manager', 'stylist'].includes(staff.role);
  },
};

type Permission =
  | 'session:create' | 'session:read:own' | 'session:read:all'
  | 'report:read:own' | 'report:read:all' | 'report:export'
  | 'staff:manage' | 'salon:settings'
  | 'success-case:create' | 'success-case:read'
  | 'training:use' | 'dashboard:view' | 'analytics:export';
```

#### 2.2.3 Session（セッション）

```typescript
// src/domain/entities/Session.ts

import { 
  SessionId, SalonId, StaffId, SessionStatus, 
  DiarizationStatus, CustomerInfo 
} from '../valueObjects';

/**
 * セッションエンティティ
 * 集約ルート
 */
export interface Session {
  readonly id: SessionId;
  readonly salonId: SalonId;
  readonly stylistId: StaffId;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
  readonly status: SessionStatus;
  readonly customerInfo: CustomerInfo | null;
  readonly diarizationStatus: DiarizationStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * セッション作成パラメータ
 */
export interface CreateSessionParams {
  salonId: SalonId;
  stylistId: StaffId;
  customerInfo?: CustomerInfo;
}

/**
 * セッションドメインサービス
 */
export const SessionDomain = {
  /**
   * セッションを作成
   */
  create(params: CreateSessionParams): Omit<Session, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      salonId: params.salonId,
      stylistId: params.stylistId,
      startedAt: new Date(),
      endedAt: null,
      status: 'recording',
      customerInfo: params.customerInfo ?? null,
      diarizationStatus: 'pending',
    };
  },

  /**
   * セッションを終了
   */
  end(session: Session): Partial<Session> {
    if (session.status !== 'recording') {
      throw new Error(`Cannot end session with status: ${session.status}`);
    }
    return {
      endedAt: new Date(),
      status: 'processing',
    };
  },

  /**
   * セッション完了
   */
  complete(session: Session): Partial<Session> {
    if (session.status !== 'processing') {
      throw new Error(`Cannot complete session with status: ${session.status}`);
    }
    return {
      status: 'completed',
    };
  },

  /**
   * セッション失敗
   */
  fail(session: Session): Partial<Session> {
    return {
      status: 'failed',
    };
  },

  /**
   * 話者分離ステータス更新
   */
  updateDiarizationStatus(
    session: Session, 
    status: DiarizationStatus
  ): Partial<Session> {
    return {
      diarizationStatus: status,
    };
  },

  /**
   * セッション時間（分）を計算
   */
  getDurationMinutes(session: Session): number {
    const endTime = session.endedAt ?? new Date();
    const diffMs = endTime.getTime() - session.startedAt.getTime();
    return Math.floor(diffMs / 1000 / 60);
  },

  /**
   * セッションがアクティブか
   */
  isActive(session: Session): boolean {
    return session.status === 'recording';
  },

  /**
   * Realtimeチャンネル名を生成
   */
  getRealtimeChannel(session: Session): string {
    return `session:${session.id}`;
  },

  /**
   * 音声保存パスを生成
   */
  getAudioPath(session: Session, chunkIndex: number): string {
    const date = session.startedAt.toISOString().split('T')[0];
    return `${session.salonId}/${date}/${session.id}/chunk_${chunkIndex.toString().padStart(4, '0')}.wav`;
  },
};
```

#### 2.2.4 Transcript（文字起こし）

```typescript
// src/domain/entities/Transcript.ts

import { TranscriptId, SessionId } from '../valueObjects';

/**
 * 文字起こしエンティティ
 */
export interface Transcript {
  readonly id: TranscriptId;
  readonly sessionId: SessionId;
  readonly chunkIndex: number;
  readonly text: string;
  readonly startTime: number;  // 秒
  readonly endTime: number;    // 秒
  readonly audioUrl: string | null;
  readonly createdAt: Date;
}

/**
 * 文字起こし作成パラメータ
 */
export interface CreateTranscriptParams {
  sessionId: SessionId;
  chunkIndex: number;
  text: string;
  startTime: number;
  endTime: number;
  audioUrl?: string;
}

/**
 * 文字起こしドメインサービス
 */
export const TranscriptDomain = {
  /**
   * 文字起こしを作成
   */
  create(params: CreateTranscriptParams): Omit<Transcript, 'id' | 'createdAt'> {
    return {
      sessionId: params.sessionId,
      chunkIndex: params.chunkIndex,
      text: params.text.trim(),
      startTime: params.startTime,
      endTime: params.endTime,
      audioUrl: params.audioUrl ?? null,
    };
  },

  /**
   * 時間範囲が妥当か検証
   */
  isValidTimeRange(startTime: number, endTime: number): boolean {
    return startTime >= 0 && endTime > startTime;
  },

  /**
   * 発話時間（秒）を計算
   */
  getDuration(transcript: Transcript): number {
    return transcript.endTime - transcript.startTime;
  },

  /**
   * 複数のTranscriptをマージ
   */
  mergeTexts(transcripts: Transcript[]): string {
    return transcripts
      .sort((a, b) => a.chunkIndex - b.chunkIndex)
      .map(t => t.text)
      .join(' ');
  },
};
```

#### 2.2.5 SpeakerSegment（話者セグメント）

```typescript
// src/domain/entities/SpeakerSegment.ts

import { SpeakerSegmentId, SessionId, Speaker } from '../valueObjects';

/**
 * 話者セグメントエンティティ
 */
export interface SpeakerSegment {
  readonly id: SpeakerSegmentId;
  readonly sessionId: SessionId;
  readonly speaker: Speaker;
  readonly startTime: number;  // 秒
  readonly endTime: number;    // 秒
  readonly text: string | null;
  readonly confidence: number | null;
  readonly createdAt: Date;
}

/**
 * 話者セグメント作成パラメータ
 */
export interface CreateSpeakerSegmentParams {
  sessionId: SessionId;
  speaker: Speaker;
  startTime: number;
  endTime: number;
  text?: string;
  confidence?: number;
}

/**
 * 話者セグメントドメインサービス
 */
export const SpeakerSegmentDomain = {
  /**
   * 話者セグメントを作成
   */
  create(params: CreateSpeakerSegmentParams): Omit<SpeakerSegment, 'id' | 'createdAt'> {
    return {
      sessionId: params.sessionId,
      speaker: params.speaker,
      startTime: params.startTime,
      endTime: params.endTime,
      text: params.text ?? null,
      confidence: params.confidence ?? null,
    };
  },

  /**
   * pyannoteの結果をSpeakerに変換
   * SPEAKER_00 -> stylist, SPEAKER_01 -> customer
   * （最初に話した方をスタイリストと仮定）
   */
  mapPyannoteLabel(label: string, isFirstSpeaker: boolean): Speaker {
    // 最初に発話した方をスタイリストとする（施術開始時は美容師が話しかける）
    if (isFirstSpeaker) {
      return label === 'SPEAKER_00' ? 'stylist' : 'customer';
    }
    return label === 'SPEAKER_00' ? 'customer' : 'stylist';
  },

  /**
   * 発話時間を計算
   */
  getDuration(segment: SpeakerSegment): number {
    return segment.endTime - segment.startTime;
  },

  /**
   * 話者別の発話時間を集計
   */
  calculateTalkTime(segments: SpeakerSegment[]): { stylist: number; customer: number } {
    return segments.reduce(
      (acc, segment) => {
        const duration = this.getDuration(segment);
        if (segment.speaker === 'stylist') {
          acc.stylist += duration;
        } else if (segment.speaker === 'customer') {
          acc.customer += duration;
        }
        return acc;
      },
      { stylist: 0, customer: 0 }
    );
  },

  /**
   * テキストと話者情報をマージ
   */
  mergeWithTranscripts(
    segments: SpeakerSegment[],
    transcripts: Transcript[]
  ): TranscriptWithSpeaker[] {
    const result: TranscriptWithSpeaker[] = [];
    
    for (const segment of segments) {
      // セグメントの時間範囲に含まれるテキストを取得
      const matchingTranscripts = transcripts.filter(
        t => t.startTime >= segment.startTime && t.endTime <= segment.endTime
      );
      
      if (matchingTranscripts.length > 0) {
        result.push({
          speaker: segment.speaker,
          text: matchingTranscripts.map(t => t.text).join(' '),
          startTime: segment.startTime,
          endTime: segment.endTime,
        });
      } else if (segment.text) {
        result.push({
          speaker: segment.speaker,
          text: segment.text,
          startTime: segment.startTime,
          endTime: segment.endTime,
        });
      }
    }
    
    return result.sort((a, b) => a.startTime - b.startTime);
  },
};

interface TranscriptWithSpeaker {
  speaker: Speaker;
  text: string;
  startTime: number;
  endTime: number;
}
```

#### 2.2.6 SessionAnalysis（セッション分析）

```typescript
// src/domain/entities/SessionAnalysis.ts

import { 
  SessionAnalysisId, SessionId, IndicatorType, 
  AnalysisDetails 
} from '../valueObjects';

/**
 * セッション分析エンティティ
 */
export interface SessionAnalysis {
  readonly id: SessionAnalysisId;
  readonly sessionId: SessionId;
  readonly chunkIndex: number;
  readonly indicatorType: IndicatorType;
  readonly value: number;
  readonly score: number;  // 0-100
  readonly details: AnalysisDetails;
  readonly createdAt: Date;
}

/**
 * セッション分析作成パラメータ
 */
export interface CreateSessionAnalysisParams {
  sessionId: SessionId;
  chunkIndex: number;
  indicatorType: IndicatorType;
  value: number;
  score: number;
  details: AnalysisDetails;
}

/**
 * 分析結果をまとめた型
 */
export interface AnalysisResultSet {
  talkRatio: SessionAnalysis | null;
  questionAnalysis: SessionAnalysis | null;
  emotionAnalysis: SessionAnalysis | null;
  concernKeywords: SessionAnalysis | null;
  proposalTiming: SessionAnalysis | null;
  proposalQuality: SessionAnalysis | null;
  conversion: SessionAnalysis | null;
}

/**
 * セッション分析ドメインサービス
 */
export const SessionAnalysisDomain = {
  /**
   * 分析結果を作成
   */
  create(params: CreateSessionAnalysisParams): Omit<SessionAnalysis, 'id' | 'createdAt'> {
    // スコアは0-100の範囲に正規化
    const normalizedScore = Math.max(0, Math.min(100, Math.round(params.score)));
    
    return {
      sessionId: params.sessionId,
      chunkIndex: params.chunkIndex,
      indicatorType: params.indicatorType,
      value: params.value,
      score: normalizedScore,
      details: params.details,
    };
  },

  /**
   * 総合スコアを計算
   */
  calculateOverallScore(analyses: AnalysisResultSet): number {
    const weights: Record<IndicatorType, number> = {
      talk_ratio: 0.15,
      question_analysis: 0.15,
      emotion_analysis: 0.15,
      concern_keywords: 0.10,
      proposal_timing: 0.15,
      proposal_quality: 0.15,
      conversion: 0.15,
    };

    let totalScore = 0;
    let totalWeight = 0;

    const analysisArray = [
      { type: 'talk_ratio' as const, analysis: analyses.talkRatio },
      { type: 'question_analysis' as const, analysis: analyses.questionAnalysis },
      { type: 'emotion_analysis' as const, analysis: analyses.emotionAnalysis },
      { type: 'concern_keywords' as const, analysis: analyses.concernKeywords },
      { type: 'proposal_timing' as const, analysis: analyses.proposalTiming },
      { type: 'proposal_quality' as const, analysis: analyses.proposalQuality },
      { type: 'conversion' as const, analysis: analyses.conversion },
    ];

    for (const { type, analysis } of analysisArray) {
      if (analysis) {
        totalScore += analysis.score * weights[type];
        totalWeight += weights[type];
      }
    }

    // 重みの合計で正規化
    return totalWeight > 0 ? Math.round(totalScore / totalWeight * 100) / 100 : 0;
  },

  /**
   * 指標別スコアマップを生成
   */
  toIndicatorScoreMap(analyses: SessionAnalysis[]): Record<IndicatorType, { score: number; value: number }> {
    const result: Partial<Record<IndicatorType, { score: number; value: number }>> = {};
    
    for (const analysis of analyses) {
      result[analysis.indicatorType] = {
        score: analysis.score,
        value: analysis.value,
      };
    }
    
    return result as Record<IndicatorType, { score: number; value: number }>;
  },

  /**
   * 最新のチャンク分析を取得
   */
  getLatestByChunk(analyses: SessionAnalysis[]): Map<IndicatorType, SessionAnalysis> {
    const latest = new Map<IndicatorType, SessionAnalysis>();
    
    for (const analysis of analyses) {
      const existing = latest.get(analysis.indicatorType);
      if (!existing || analysis.chunkIndex > existing.chunkIndex) {
        latest.set(analysis.indicatorType, analysis);
      }
    }
    
    return latest;
  },
};
```

#### 2.2.7 SessionReport（セッションレポート）

```typescript
// src/domain/entities/SessionReport.ts

import { 
  SessionReportId, SessionId, IndicatorScores 
} from '../valueObjects';

/**
 * セッションレポートエンティティ
 */
export interface SessionReport {
  readonly id: SessionReportId;
  readonly sessionId: SessionId;
  readonly overallScore: number;
  readonly goodPoints: string[];
  readonly improvementPoints: string[];
  readonly actionItems: string[];
  readonly transcriptSummary: string | null;
  readonly aiFeedback: string | null;
  readonly indicatorScores: IndicatorScores;
  readonly createdAt: Date;
}

/**
 * セッションレポート作成パラメータ
 */
export interface CreateSessionReportParams {
  sessionId: SessionId;
  overallScore: number;
  goodPoints: string[];
  improvementPoints: string[];
  actionItems: string[];
  transcriptSummary?: string;
  aiFeedback?: string;
  indicatorScores: IndicatorScores;
}

/**
 * セッションレポートドメインサービス
 */
export const SessionReportDomain = {
  /**
   * レポートを作成
   */
  create(params: CreateSessionReportParams): Omit<SessionReport, 'id' | 'createdAt'> {
    return {
      sessionId: params.sessionId,
      overallScore: Math.max(0, Math.min(100, Math.round(params.overallScore))),
      goodPoints: params.goodPoints.slice(0, 5),  // 最大5つ
      improvementPoints: params.improvementPoints.slice(0, 5),
      actionItems: params.actionItems.slice(0, 5),
      transcriptSummary: params.transcriptSummary ?? null,
      aiFeedback: params.aiFeedback ?? null,
      indicatorScores: params.indicatorScores,
    };
  },

  /**
   * スコアのランクを取得
   */
  getScoreRank(report: SessionReport): ScoreRank {
    if (report.overallScore >= 90) return 'S';
    if (report.overallScore >= 80) return 'A';
    if (report.overallScore >= 70) return 'B';
    if (report.overallScore >= 60) return 'C';
    return 'D';
  },

  /**
   * 最も改善が必要な指標を取得
   */
  getWeakestIndicator(report: SessionReport): IndicatorType | null {
    let weakest: IndicatorType | null = null;
    let lowestScore = 101;

    for (const [type, data] of Object.entries(report.indicatorScores)) {
      if (data.score < lowestScore) {
        lowestScore = data.score;
        weakest = type as IndicatorType;
      }
    }

    return weakest;
  },

  /**
   * 最も優れている指標を取得
   */
  getStrongestIndicator(report: SessionReport): IndicatorType | null {
    let strongest: IndicatorType | null = null;
    let highestScore = -1;

    for (const [type, data] of Object.entries(report.indicatorScores)) {
      if (data.score > highestScore) {
        highestScore = data.score;
        strongest = type as IndicatorType;
      }
    }

    return strongest;
  },
};

type ScoreRank = 'S' | 'A' | 'B' | 'C' | 'D';
type IndicatorType = 
  | 'talk_ratio' 
  | 'question_analysis' 
  | 'emotion_analysis' 
  | 'concern_keywords' 
  | 'proposal_timing' 
  | 'proposal_quality' 
  | 'conversion';
```

#### 2.2.8 SuccessCase（成功事例）

```typescript
// src/domain/entities/SuccessCase.ts

import { 
  SuccessCaseId, SalonId, SessionId, StaffId,
  CustomerProfile, Embedding 
} from '../valueObjects';

/**
 * 成功事例エンティティ
 * 集約ルート
 */
export interface SuccessCase {
  readonly id: SuccessCaseId;
  readonly salonId: SalonId;
  readonly sessionId: SessionId | null;
  readonly stylistId: StaffId | null;
  readonly concernKeywords: string[];
  readonly customerProfile: CustomerProfile | null;
  readonly successfulTalk: string;
  readonly keyTactics: string[];
  readonly soldProduct: string | null;
  readonly conversionRate: number | null;
  readonly embedding: Embedding | null;
  readonly isPublic: boolean;
  readonly createdAt: Date;
}

/**
 * 成功事例作成パラメータ
 */
export interface CreateSuccessCaseParams {
  salonId: SalonId;
  sessionId?: SessionId;
  stylistId?: StaffId;
  concernKeywords: string[];
  customerProfile?: CustomerProfile;
  successfulTalk: string;
  keyTactics: string[];
  soldProduct?: string;
  conversionRate?: number;
  isPublic?: boolean;
}

/**
 * 成功事例検索パラメータ
 */
export interface SearchSuccessCaseParams {
  concernKeywords?: string[];
  customerProfile?: Partial<CustomerProfile>;
  embedding?: Embedding;
  limit?: number;
  salonId?: SalonId;
  includePublic?: boolean;
}

/**
 * 成功事例ドメインサービス
 */
export const SuccessCaseDomain = {
  /**
   * 成功事例を作成
   */
  create(params: CreateSuccessCaseParams): Omit<SuccessCase, 'id' | 'createdAt' | 'embedding'> {
    return {
      salonId: params.salonId,
      sessionId: params.sessionId ?? null,
      stylistId: params.stylistId ?? null,
      concernKeywords: params.concernKeywords,
      customerProfile: params.customerProfile ?? null,
      successfulTalk: params.successfulTalk,
      keyTactics: params.keyTactics,
      soldProduct: params.soldProduct ?? null,
      conversionRate: params.conversionRate ?? null,
      isPublic: params.isPublic ?? false,
    };
  },

  /**
   * 検索用テキストを生成（Embedding用）
   */
  generateSearchText(successCase: Omit<SuccessCase, 'id' | 'createdAt' | 'embedding'>): string {
    const parts: string[] = [];
    
    // 悩みキーワード
    if (successCase.concernKeywords.length > 0) {
      parts.push(`悩み: ${successCase.concernKeywords.join(', ')}`);
    }
    
    // お客様属性
    if (successCase.customerProfile) {
      const profile = successCase.customerProfile;
      if (profile.ageGroup) parts.push(`年代: ${profile.ageGroup}`);
      if (profile.gender) parts.push(`性別: ${profile.gender}`);
      if (profile.visitFrequency) parts.push(`来店頻度: ${profile.visitFrequency}`);
    }
    
    // 成功トーク
    parts.push(`トーク: ${successCase.successfulTalk}`);
    
    // キーポイント
    if (successCase.keyTactics.length > 0) {
      parts.push(`ポイント: ${successCase.keyTactics.join(', ')}`);
    }
    
    // 商品
    if (successCase.soldProduct) {
      parts.push(`商品: ${successCase.soldProduct}`);
    }
    
    return parts.join('\n');
  },

  /**
   * 類似度スコアを計算（コサイン類似度）
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embedding dimensions do not match');
    }
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  },

  /**
   * 閾値以上の類似度を持つ事例をフィルタリング
   */
  filterBySimilarity(
    cases: Array<SuccessCase & { similarity: number }>,
    threshold: number = 0.7
  ): Array<SuccessCase & { similarity: number }> {
    return cases
      .filter(c => c.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);
  },
};
```

### 2.3 値オブジェクト定義

```typescript
// src/domain/valueObjects/index.ts

/**
 * 識別子型（Branded Types）
 */
export type SalonId = string & { readonly __brand: 'SalonId' };
export type StaffId = string & { readonly __brand: 'StaffId' };
export type SessionId = string & { readonly __brand: 'SessionId' };
export type TranscriptId = string & { readonly __brand: 'TranscriptId' };
export type SpeakerSegmentId = string & { readonly __brand: 'SpeakerSegmentId' };
export type SessionAnalysisId = string & { readonly __brand: 'SessionAnalysisId' };
export type SessionReportId = string & { readonly __brand: 'SessionReportId' };
export type SuccessCaseId = string & { readonly __brand: 'SuccessCaseId' };
export type AuthUserId = string & { readonly __brand: 'AuthUserId' };

/**
 * ID生成ユーティリティ
 */
export const createId = {
  salon: (id: string): SalonId => id as SalonId,
  staff: (id: string): StaffId => id as StaffId,
  session: (id: string): SessionId => id as SessionId,
  transcript: (id: string): TranscriptId => id as TranscriptId,
  speakerSegment: (id: string): SpeakerSegmentId => id as SpeakerSegmentId,
  sessionAnalysis: (id: string): SessionAnalysisId => id as SessionAnalysisId,
  sessionReport: (id: string): SessionReportId => id as SessionReportId,
  successCase: (id: string): SuccessCaseId => id as SuccessCaseId,
  authUser: (id: string): AuthUserId => id as AuthUserId,
};

/**
 * プラン
 */
export type Plan = 'standard' | 'professional' | 'enterprise';

export const PlanDisplay: Record<Plan, string> = {
  standard: 'スタンダード',
  professional: 'プロフェッショナル',
  enterprise: 'エンタープライズ',
};

/**
 * スタッフロール
 */
export type StaffRole = 'owner' | 'manager' | 'stylist' | 'assistant';

export const StaffRoleDisplay: Record<StaffRole, string> = {
  owner: 'オーナー',
  manager: 'マネージャー',
  stylist: 'スタイリスト',
  assistant: 'アシスタント',
};

/**
 * セッションステータス
 */
export type SessionStatus = 'recording' | 'processing' | 'completed' | 'failed';

export const SessionStatusDisplay: Record<SessionStatus, string> = {
  recording: '録音中',
  processing: '処理中',
  completed: '完了',
  failed: '失敗',
};

/**
 * 話者分離ステータス
 */
export type DiarizationStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * 話者
 */
export type Speaker = 'stylist' | 'customer' | 'unknown';

export const SpeakerDisplay: Record<Speaker, string> = {
  stylist: 'スタイリスト',
  customer: 'お客様',
  unknown: '不明',
};

/**
 * 分析指標タイプ
 */
export type IndicatorType =
  | 'talk_ratio'
  | 'question_analysis'
  | 'emotion_analysis'
  | 'concern_keywords'
  | 'proposal_timing'
  | 'proposal_quality'
  | 'conversion';

export const IndicatorTypeDisplay: Record<IndicatorType, string> = {
  talk_ratio: 'トーク比率',
  question_analysis: '質問分析',
  emotion_analysis: '感情分析',
  concern_keywords: '悩みキーワード',
  proposal_timing: '提案タイミング',
  proposal_quality: '提案品質',
  conversion: '成約判定',
};

/**
 * 年代
 */
export type AgeGroup = '10s' | '20s' | '30s' | '40s' | '50s' | '60s+';

export const AgeGroupDisplay: Record<AgeGroup, string> = {
  '10s': '10代',
  '20s': '20代',
  '30s': '30代',
  '40s': '40代',
  '50s': '50代',
  '60s+': '60代以上',
};

/**
 * 性別
 */
export type Gender = 'male' | 'female' | 'other';

export const GenderDisplay: Record<Gender, string> = {
  male: '男性',
  female: '女性',
  other: 'その他',
};

/**
 * 来店頻度
 */
export type VisitFrequency = 'first' | 'monthly' | 'bimonthly' | 'quarterly' | 'irregular';

export const VisitFrequencyDisplay: Record<VisitFrequency, string> = {
  first: '初めて',
  monthly: '月1回',
  bimonthly: '2ヶ月に1回',
  quarterly: '3ヶ月に1回',
  irregular: '不定期',
};

/**
 * お客様情報
 */
export interface CustomerInfo {
  ageGroup?: AgeGroup;
  gender?: Gender;
  visitFrequency?: VisitFrequency;
  notes?: string;
}

/**
 * お客様プロフィール（成功事例用）
 */
export interface CustomerProfile {
  ageGroup?: AgeGroup;
  gender?: Gender;
  visitFrequency?: VisitFrequency;
  hairType?: string;
  concerns?: string[];
}

/**
 * 店舗設定
 */
export interface SalonSettings {
  notification: {
    enablePush: boolean;
    enableEmail: boolean;
    concernDetectionAlert: boolean;
    sessionCompleteAlert: boolean;
  };
  analysis: {
    idealTalkRatio: number;
    minQuestionCount: number;
    concernKeywords: string[];
  };
  display: {
    showRanking: boolean;
    anonymizeCustomer: boolean;
  };
}

/**
 * スタッフ設定
 */
export interface StaffSettings {
  notificationPreferences: {
    concernAlert: boolean;
    sessionComplete: boolean;
    weeklyReport: boolean;
  };
  displayPreferences: {
    showScore: boolean;
    showRanking: boolean;
  };
}

/**
 * 分析詳細
 */
export interface AnalysisDetails {
  // talk_ratio
  stylistSeconds?: number;
  customerSeconds?: number;
  totalSeconds?: number;
  ratio?: number;
  
  // question_analysis
  totalQuestions?: number;
  openQuestions?: number;
  closedQuestions?: number;
  openRatio?: number;
  questionList?: Array<{
    text: string;
    type: 'open' | 'closed';
    time: number;
  }>;
  
  // emotion_analysis
  positiveRatio?: number;
  keywords?: string[];
  overall?: 'positive' | 'neutral' | 'negative';
  
  // concern_keywords
  detected?: boolean;
  detectedKeywords?: string[];
  detectedAt?: number[];
  context?: string;
  
  // proposal_timing
  concernDetectedAt?: number;
  proposalAt?: number;
  timingMinutes?: number;
  
  // proposal_quality
  hasProposal?: boolean;
  benefitRatio?: number;
  proposalDetails?: string[];
  
  // conversion
  converted?: boolean;
  productName?: string | null;
}

/**
 * 指標スコア（レポート用）
 */
export interface IndicatorScores {
  talk_ratio?: { score: number; value: number };
  question_analysis?: { score: number; value: number };
  emotion_analysis?: { score: number; value: number };
  concern_keywords?: { score: number; value: number };
  proposal_timing?: { score: number; value: number };
  proposal_quality?: { score: number; value: number };
  conversion?: { score: number; value: number };
}

/**
 * ベクトル埋め込み
 */
export type Embedding = number[];

/**
 * Embedding次元数
 */
export const EMBEDDING_DIMENSION = 1536;

/**
 * Embeddingバリデーション
 */
export const isValidEmbedding = (embedding: unknown): embedding is Embedding => {
  return (
    Array.isArray(embedding) &&
    embedding.length === EMBEDDING_DIMENSION &&
    embedding.every(v => typeof v === 'number' && !isNaN(v))
  );
};
```

### 2.4 リポジトリインターフェース

```typescript
// src/domain/repositories/index.ts

import { 
  Salon, CreateSalonParams, UpdateSalonParams,
  Staff, CreateStaffParams, UpdateStaffParams,
  Session, CreateSessionParams,
  Transcript, CreateTranscriptParams,
  SpeakerSegment, CreateSpeakerSegmentParams,
  SessionAnalysis, CreateSessionAnalysisParams,
  SessionReport, CreateSessionReportParams,
  SuccessCase, CreateSuccessCaseParams, SearchSuccessCaseParams,
} from '../entities';
import { 
  SalonId, StaffId, SessionId, AuthUserId, 
  Embedding, IndicatorType 
} from '../valueObjects';

/**
 * 店舗リポジトリ
 */
export interface SalonRepository {
  findById(id: SalonId): Promise<Salon | null>;
  create(params: CreateSalonParams): Promise<Salon>;
  update(id: SalonId, params: UpdateSalonParams): Promise<Salon>;
  delete(id: SalonId): Promise<void>;
}

/**
 * スタッフリポジトリ
 */
export interface StaffRepository {
  findById(id: StaffId): Promise<Staff | null>;
  findByAuthUserId(authUserId: AuthUserId): Promise<Staff | null>;
  findBySalonId(salonId: SalonId): Promise<Staff[]>;
  findActiveByRole(salonId: SalonId, role: Staff['role']): Promise<Staff[]>;
  create(params: CreateStaffParams): Promise<Staff>;
  update(id: StaffId, params: UpdateStaffParams): Promise<Staff>;
  delete(id: StaffId): Promise<void>;
  countBySalonId(salonId: SalonId): Promise<number>;
}

/**
 * セッションリポジトリ
 */
export interface SessionRepository {
  findById(id: SessionId): Promise<Session | null>;
  findByStylistId(stylistId: StaffId, options?: { 
    limit?: number; 
    offset?: number;
    status?: Session['status'];
  }): Promise<Session[]>;
  findBySalonId(salonId: SalonId, options?: {
    limit?: number;
    offset?: number;
    status?: Session['status'];
    startDate?: Date;
    endDate?: Date;
  }): Promise<Session[]>;
  findActiveByStylisId(stylistId: StaffId): Promise<Session | null>;
  create(params: CreateSessionParams): Promise<Session>;
  update(id: SessionId, params: Partial<Session>): Promise<Session>;
  countBySalonId(salonId: SalonId, options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<number>;
}

/**
 * 文字起こしリポジトリ
 */
export interface TranscriptRepository {
  findBySessionId(sessionId: SessionId): Promise<Transcript[]>;
  findBySessionIdAndChunk(sessionId: SessionId, chunkIndex: number): Promise<Transcript | null>;
  create(params: CreateTranscriptParams): Promise<Transcript>;
  createMany(params: CreateTranscriptParams[]): Promise<Transcript[]>;
}

/**
 * 話者セグメントリポジトリ
 */
export interface SpeakerSegmentRepository {
  findBySessionId(sessionId: SessionId): Promise<SpeakerSegment[]>;
  create(params: CreateSpeakerSegmentParams): Promise<SpeakerSegment>;
  createMany(params: CreateSpeakerSegmentParams[]): Promise<SpeakerSegment[]>;
  deleteBySessionId(sessionId: SessionId): Promise<void>;
}

/**
 * セッション分析リポジトリ
 */
export interface SessionAnalysisRepository {
  findBySessionId(sessionId: SessionId): Promise<SessionAnalysis[]>;
  findBySessionIdAndChunk(sessionId: SessionId, chunkIndex: number): Promise<SessionAnalysis[]>;
  findLatestBySessionId(sessionId: SessionId): Promise<Map<IndicatorType, SessionAnalysis>>;
  create(params: CreateSessionAnalysisParams): Promise<SessionAnalysis>;
  createMany(params: CreateSessionAnalysisParams[]): Promise<SessionAnalysis[]>;
}

/**
 * セッションレポートリポジトリ
 */
export interface SessionReportRepository {
  findBySessionId(sessionId: SessionId): Promise<SessionReport | null>;
  findByStylistId(stylistId: StaffId, options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<SessionReport[]>;
  create(params: CreateSessionReportParams): Promise<SessionReport>;
  getAverageScoreByStylisId(stylistId: StaffId, options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<number>;
  getAverageScoreBySalonId(salonId: SalonId, options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<number>;
}

/**
 * 成功事例リポジトリ
 */
export interface SuccessCaseRepository {
  findById(id: SuccessCaseId): Promise<SuccessCase | null>;
  findBySalonId(salonId: SalonId, options?: {
    limit?: number;
    offset?: number;
  }): Promise<SuccessCase[]>;
  findPublic(options?: {
    limit?: number;
    offset?: number;
  }): Promise<SuccessCase[]>;
  searchByEmbedding(embedding: Embedding, options: {
    salonId?: SalonId;
    includePublic?: boolean;
    limit?: number;
    threshold?: number;
  }): Promise<Array<SuccessCase & { similarity: number }>>;
  searchByKeywords(keywords: string[], options: {
    salonId?: SalonId;
    includePublic?: boolean;
    limit?: number;
  }): Promise<SuccessCase[]>;
  create(params: CreateSuccessCaseParams): Promise<SuccessCase>;
  updateEmbedding(id: SuccessCaseId, embedding: Embedding): Promise<SuccessCase>;
  delete(id: SuccessCaseId): Promise<void>;
}
```

---

（続きは Part 2 に記載: API詳細仕様）
# 詳細設計書 Part 2: API詳細仕様

---

## 3. API詳細仕様

### 3.1 API設計方針

| 方針 | 説明 |
|------|------|
| RESTful | リソース指向のエンドポイント設計 |
| JSON | リクエスト/レスポンスボディはJSON形式 |
| JWT認証 | Supabase Auth発行のJWTトークンで認証 |
| HTTPステータス | 適切なHTTPステータスコードを返却 |
| エラー形式 | 統一されたエラーレスポンス形式 |
| バージョニング | URLパスでのバージョニング（v1） |

### 3.2 共通仕様

#### 3.2.1 認証ヘッダー

```
Authorization: Bearer {access_token}
```

#### 3.2.2 共通リクエストヘッダー

| ヘッダー | 必須 | 説明 |
|---------|------|------|
| Authorization | ○ | Bearer トークン |
| Content-Type | ○ | application/json |
| X-Request-ID | × | リクエスト追跡用ID |

#### 3.2.3 共通レスポンス形式

**成功時**:

```typescript
interface SuccessResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}
```

**エラー時**:

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

#### 3.2.4 HTTPステータスコード

| コード | 説明 | 使用場面 |
|--------|------|---------|
| 200 | OK | 正常取得・更新 |
| 201 | Created | 正常作成 |
| 204 | No Content | 正常削除 |
| 400 | Bad Request | リクエスト不正 |
| 401 | Unauthorized | 認証エラー |
| 403 | Forbidden | 権限エラー |
| 404 | Not Found | リソース未存在 |
| 409 | Conflict | 競合エラー |
| 422 | Unprocessable Entity | バリデーションエラー |
| 429 | Too Many Requests | レート制限 |
| 500 | Internal Server Error | サーバーエラー |
| 503 | Service Unavailable | サービス一時停止 |

### 3.3 Edge Functions 詳細仕様

#### 3.3.1 create-session

**エンドポイント**: `POST /functions/v1/create-session`

**説明**: 新しいセッションを作成し、リアルタイム分析を開始する

**リクエスト**:

```typescript
interface CreateSessionRequest {
  stylistId: string;  // UUID
  customerInfo?: {
    ageGroup?: '10s' | '20s' | '30s' | '40s' | '50s' | '60s+';
    gender?: 'male' | 'female' | 'other';
    visitFrequency?: 'first' | 'monthly' | 'bimonthly' | 'quarterly' | 'irregular';
    notes?: string;  // max 500 chars
  };
}
```

**レスポンス**:

```typescript
// 201 Created
interface CreateSessionResponse {
  data: {
    sessionId: string;
    status: 'recording';
    startedAt: string;  // ISO8601
    realtimeChannel: string;  // "session:{sessionId}"
  };
}
```

**エラー**:

| コード | 説明 |
|--------|------|
| AUTH_001 | 認証トークン無効 |
| VAL_001 | stylistId未指定 |
| VAL_002 | customerInfo形式不正 |
| SES_004 | アクティブセッション存在 |

**実装**:

```typescript
// supabase/functions/create-session/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// バリデーションスキーマ
const CreateSessionSchema = z.object({
  stylistId: z.string().uuid(),
  customerInfo: z.object({
    ageGroup: z.enum(['10s', '20s', '30s', '40s', '50s', '60s+']).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    visitFrequency: z.enum(['first', 'monthly', 'bimonthly', 'quarterly', 'irregular']).optional(),
    notes: z.string().max(500).optional(),
  }).optional(),
});

serve(async (req: Request) => {
  try {
    // CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, content-type',
        },
      });
    }

    // 認証チェック
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('AUTH_001', '認証が必要です', 401);
    }

    // Supabaseクライアント（ユーザーコンテキスト）
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // ユーザー取得
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse('AUTH_001', '認証に失敗しました', 401);
    }

    // リクエストボディ解析
    const body = await req.json();
    const parseResult = CreateSessionSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse('VAL_001', 'リクエストが不正です', 400, {
        details: parseResult.error.errors,
      });
    }

    const { stylistId, customerInfo } = parseResult.data;

    // スタッフ情報取得
    const { data: staff, error: staffError } = await supabase
      .from('staffs')
      .select('id, salon_id, role, is_active')
      .eq('id', stylistId)
      .single();

    if (staffError || !staff) {
      return errorResponse('VAL_001', 'スタイリストが見つかりません', 400);
    }

    if (!staff.is_active) {
      return errorResponse('VAL_001', 'スタイリストが無効です', 400);
    }

    // アクティブセッション確認
    const { data: activeSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('stylist_id', stylistId)
      .eq('status', 'recording')
      .single();

    if (activeSession) {
      return errorResponse('SES_004', '既にアクティブなセッションがあります', 409);
    }

    // セッション作成
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        salon_id: staff.salon_id,
        stylist_id: stylistId,
        status: 'recording',
        customer_info: customerInfo || null,
        diarization_status: 'pending',
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return errorResponse('DB_001', 'セッションの作成に失敗しました', 500);
    }

    // 成功レスポンス
    return new Response(
      JSON.stringify({
        data: {
          sessionId: session.id,
          status: session.status,
          startedAt: session.started_at,
          realtimeChannel: `session:${session.id}`,
        },
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('SYS_001', 'システムエラーが発生しました', 500);
  }
});

function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>
) {
  return new Response(
    JSON.stringify({
      error: { code, message, details },
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
```

---

#### 3.3.2 process-audio

**エンドポイント**: `POST /functions/v1/process-audio`

**説明**: 音声チャンクを受信し、文字起こし保存・話者分離をトリガー

**リクエスト**: `multipart/form-data`

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| sessionId | string | ○ | セッションID |
| chunkIndex | number | ○ | チャンク番号 |
| audio | File | ○ | WAVファイル（最大10MB） |
| transcripts | JSON | ○ | 文字起こし結果 |

**transcripts形式**:

```typescript
interface TranscriptData {
  text: string;
  startTime: number;
  endTime: number;
  segments?: Array<{
    text: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
}
```

**レスポンス**:

```typescript
// 200 OK
interface ProcessAudioResponse {
  data: {
    transcriptId: string;
    audioUrl: string;
    diarizationTriggered: boolean;
  };
}
```

**実装**:

```typescript
// supabase/functions/process-audio/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const PYANNOTE_SERVER = Deno.env.get('PYANNOTE_SERVER_URL');
const PYANNOTE_API_KEY = Deno.env.get('PYANNOTE_API_KEY');

serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    // 認証
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('AUTH_001', '認証が必要です', 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // multipart/form-data解析
    const formData = await req.formData();
    const sessionId = formData.get('sessionId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string, 10);
    const audioFile = formData.get('audio') as File;
    const transcriptsJson = formData.get('transcripts') as string;

    // バリデーション
    if (!sessionId || isNaN(chunkIndex) || !audioFile || !transcriptsJson) {
      return errorResponse('VAL_001', '必須パラメータが不足しています', 400);
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      return errorResponse('VAL_002', 'ファイルサイズが上限を超えています', 400);
    }

    // セッション存在確認
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, salon_id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return errorResponse('SES_001', 'セッションが見つかりません', 404);
    }

    if (session.status !== 'recording') {
      return errorResponse('SES_002', 'セッションは録音中ではありません', 400);
    }

    // 音声ファイルをStorageにアップロード
    const date = new Date().toISOString().split('T')[0];
    const audioPath = `${session.salon_id}/${date}/${sessionId}/chunk_${chunkIndex.toString().padStart(4, '0')}.wav`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-chunks')
      .upload(audioPath, audioFile, {
        contentType: 'audio/wav',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return errorResponse('SYS_001', '音声ファイルのアップロードに失敗しました', 500);
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('audio-chunks')
      .getPublicUrl(audioPath);

    const audioUrl = urlData.publicUrl;

    // 文字起こしを保存
    const transcripts = JSON.parse(transcriptsJson);
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .insert({
        session_id: sessionId,
        chunk_index: chunkIndex,
        text: transcripts.text,
        start_time: transcripts.startTime,
        end_time: transcripts.endTime,
        audio_url: audioUrl,
      })
      .select()
      .single();

    if (transcriptError) {
      console.error('Transcript save error:', transcriptError);
      return errorResponse('DB_001', '文字起こしの保存に失敗しました', 500);
    }

    // 話者分離をトリガー
    let diarizationTriggered = false;
    if (PYANNOTE_SERVER && PYANNOTE_API_KEY) {
      try {
        const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/diarization-callback`;
        
        const diarizeForm = new FormData();
        diarizeForm.append('audio', audioFile);
        diarizeForm.append('callback_url', callbackUrl);
        diarizeForm.append('num_speakers', '2');
        diarizeForm.append('chunk_index', chunkIndex.toString());

        const diarizeResponse = await fetch(
          `${PYANNOTE_SERVER}/diarize/${sessionId}`,
          {
            method: 'POST',
            headers: {
              'X-API-Key': PYANNOTE_API_KEY,
            },
            body: diarizeForm,
          }
        );

        if (diarizeResponse.ok) {
          diarizationTriggered = true;
          
          // セッションの話者分離ステータスを更新
          await supabase
            .from('sessions')
            .update({ diarization_status: 'processing' })
            .eq('id', sessionId);
        } else {
          console.error('Diarization trigger failed:', await diarizeResponse.text());
        }
      } catch (diarizeError) {
        console.error('Diarization error:', diarizeError);
        // 話者分離失敗は致命的エラーとしない
      }
    }

    return corsResponse({
      data: {
        transcriptId: transcript.id,
        audioUrl,
        diarizationTriggered,
      },
    }, 200);

  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('SYS_001', 'システムエラーが発生しました', 500);
  }
});

function corsResponse(body: unknown, status: number) {
  return new Response(
    body ? JSON.stringify(body) : null,
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    }
  );
}

function errorResponse(code: string, message: string, status: number) {
  return corsResponse({ error: { code, message } }, status);
}
```

---

#### 3.3.3 diarization-callback

**エンドポイント**: `POST /functions/v1/diarization-callback`

**説明**: pyannoteサーバーからの話者分離結果を受信し、分析をトリガー

**リクエスト**:

```typescript
interface DiarizationCallbackRequest {
  session_id: string;
  chunk_index: number;
  status: 'completed' | 'failed';
  segments?: Array<{
    speaker: 'SPEAKER_00' | 'SPEAKER_01';
    start: number;
    end: number;
  }>;
  error?: string;
}
```

**レスポンス**:

```typescript
// 200 OK
interface DiarizationCallbackResponse {
  data: {
    processed: boolean;
    segmentCount: number;
    analysisTriggered: boolean;
  };
}
```

**実装**:

```typescript
// supabase/functions/diarization-callback/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPECTED_API_KEY = Deno.env.get('PYANNOTE_CALLBACK_SECRET');

serve(async (req: Request) => {
  try {
    // API Keyによる認証（内部呼び出し用）
    const apiKey = req.headers.get('X-Callback-Secret');
    if (apiKey !== EXPECTED_API_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // Service Role Key使用
    );

    const body = await req.json();
    const { session_id, chunk_index, status, segments, error } = body;

    if (status === 'failed') {
      console.error(`Diarization failed for session ${session_id}:`, error);
      
      await supabase
        .from('sessions')
        .update({ diarization_status: 'failed' })
        .eq('id', session_id);
      
      return new Response(
        JSON.stringify({ data: { processed: false, segmentCount: 0, analysisTriggered: false } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 話者セグメントを保存
    // 最初のセグメントのspeakerをstylistとする（美容師が先に話しかける想定）
    const firstSpeaker = segments[0]?.speaker || 'SPEAKER_00';
    
    const speakerSegments = segments.map((segment: any) => ({
      session_id,
      speaker: segment.speaker === firstSpeaker ? 'stylist' : 'customer',
      start_time: segment.start,
      end_time: segment.end,
      confidence: segment.confidence || null,
    }));

    const { data: insertedSegments, error: insertError } = await supabase
      .from('speaker_segments')
      .insert(speakerSegments)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // 文字起こしを取得してセグメントにマッチング
    const { data: transcripts } = await supabase
      .from('transcripts')
      .select('*')
      .eq('session_id', session_id)
      .eq('chunk_index', chunk_index);

    // テキストをセグメントに割り当て
    if (transcripts && transcripts.length > 0) {
      const fullText = transcripts[0].text;
      // 簡易的な割り当て（時間比率で分割）
      // 実際には音声認識結果のタイムスタンプを使用
    }

    // 分析をトリガー
    let analysisTriggered = false;
    try {
      const analyzeResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-segment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: session_id,
            chunkIndex: chunk_index,
          }),
        }
      );
      
      if (analyzeResponse.ok) {
        analysisTriggered = true;
      }
    } catch (analyzeError) {
      console.error('Analyze trigger error:', analyzeError);
    }

    // セッションの話者分離ステータスを更新
    await supabase
      .from('sessions')
      .update({ diarization_status: 'completed' })
      .eq('id', session_id);

    return new Response(
      JSON.stringify({
        data: {
          processed: true,
          segmentCount: insertedSegments?.length || 0,
          analysisTriggered,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Callback error:', error);
    return new Response(
      JSON.stringify({ error: { message: 'Internal error' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

#### 3.3.4 analyze-segment

**エンドポイント**: `POST /functions/v1/analyze-segment`

**説明**: 話者分離済みのセグメントをAI分析し、7指標を計算

**リクエスト**:

```typescript
interface AnalyzeSegmentRequest {
  sessionId: string;
  chunkIndex: number;
}
```

**レスポンス**:

```typescript
// 200 OK
interface AnalyzeSegmentResponse {
  data: {
    overallScore: number;
    indicators: {
      talk_ratio: { score: number; value: number };
      question_analysis: { score: number; value: number };
      emotion_analysis: { score: number; value: number };
      concern_keywords: { score: number; value: number };
      proposal_timing: { score: number; value: number };
      proposal_quality: { score: number; value: number };
      conversion: { score: number; value: number };
    };
    concernsDetected: string[];
    notificationRequired: boolean;
  };
}
```

**実装**:

```typescript
// supabase/functions/analyze-segment/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { sessionId, chunkIndex } = await req.json();

    // セッション取得
    const { data: session } = await supabase
      .from('sessions')
      .select('*, salons(*)')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return errorResponse('SES_001', 'セッションが見つかりません', 404);
    }

    // 話者セグメント取得
    const { data: segments } = await supabase
      .from('speaker_segments')
      .select('*')
      .eq('session_id', sessionId)
      .order('start_time');

    // 文字起こし取得
    const { data: transcripts } = await supabase
      .from('transcripts')
      .select('*')
      .eq('session_id', sessionId)
      .order('chunk_index');

    // テキストと話者をマージ
    const conversationData = mergeTranscriptsWithSpeakers(transcripts || [], segments || []);

    // 分析実行（並列処理）
    const [
      talkRatio,
      questionAnalysis,
      emotionAnalysis,
      concernKeywords,
      proposalTiming,
      proposalQuality,
      conversion,
    ] = await Promise.all([
      analyzeTalkRatio(segments || []),
      analyzeQuestions(conversationData),
      analyzeEmotion(conversationData),
      detectConcerns(conversationData, session.salons.settings.analysis.concernKeywords),
      analyzeProposalTiming(conversationData),
      analyzeProposalQuality(conversationData),
      detectConversion(conversationData),
    ]);

    // 分析結果を保存
    const analyses = [
      { ...talkRatio, indicatorType: 'talk_ratio' },
      { ...questionAnalysis, indicatorType: 'question_analysis' },
      { ...emotionAnalysis, indicatorType: 'emotion_analysis' },
      { ...concernKeywords, indicatorType: 'concern_keywords' },
      { ...proposalTiming, indicatorType: 'proposal_timing' },
      { ...proposalQuality, indicatorType: 'proposal_quality' },
      { ...conversion, indicatorType: 'conversion' },
    ];

    const insertData = analyses.map(a => ({
      session_id: sessionId,
      chunk_index: chunkIndex,
      indicator_type: a.indicatorType,
      value: a.value,
      score: a.score,
      details: a.details,
    }));

    await supabase.from('session_analyses').insert(insertData);

    // 総合スコア計算
    const overallScore = calculateOverallScore(analyses);

    // Realtimeでブロードキャスト
    await supabase
      .channel(`session:${sessionId}`)
      .send({
        type: 'broadcast',
        event: 'analysis',
        payload: {
          chunkIndex,
          overallScore,
          indicators: {
            talk_ratio: { score: talkRatio.score, value: talkRatio.value },
            question_analysis: { score: questionAnalysis.score, value: questionAnalysis.value },
            emotion_analysis: { score: emotionAnalysis.score, value: emotionAnalysis.value },
            concern_keywords: { score: concernKeywords.score, value: concernKeywords.value },
            proposal_timing: { score: proposalTiming.score, value: proposalTiming.value },
            proposal_quality: { score: proposalQuality.score, value: proposalQuality.value },
            conversion: { score: conversion.score, value: conversion.value },
          },
        },
      });

    // 悩みキーワード検出時は成功事例検索をトリガー
    let notificationRequired = false;
    if (concernKeywords.details.detected && concernKeywords.details.detectedKeywords?.length > 0) {
      notificationRequired = true;
      
      // 成功事例検索をトリガー
      await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/search-cases`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            concernKeywords: concernKeywords.details.detectedKeywords,
            customerInfo: session.customer_info,
          }),
        }
      );
    }

    return new Response(
      JSON.stringify({
        data: {
          overallScore,
          indicators: {
            talk_ratio: { score: talkRatio.score, value: talkRatio.value },
            question_analysis: { score: questionAnalysis.score, value: questionAnalysis.value },
            emotion_analysis: { score: emotionAnalysis.score, value: emotionAnalysis.value },
            concern_keywords: { score: concernKeywords.score, value: concernKeywords.value },
            proposal_timing: { score: proposalTiming.score, value: proposalTiming.value },
            proposal_quality: { score: proposalQuality.score, value: proposalQuality.value },
            conversion: { score: conversion.score, value: conversion.value },
          },
          concernsDetected: concernKeywords.details.detectedKeywords || [],
          notificationRequired,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analysis error:', error);
    return errorResponse('SYS_001', 'システムエラーが発生しました', 500);
  }
});

// 分析関数（詳細実装はPart 6のアルゴリズム詳細設計を参照）

function analyzeTalkRatio(segments: any[]) {
  let stylistTime = 0;
  let customerTime = 0;

  for (const segment of segments) {
    const duration = segment.end_time - segment.start_time;
    if (segment.speaker === 'stylist') {
      stylistTime += duration;
    } else if (segment.speaker === 'customer') {
      customerTime += duration;
    }
  }

  const totalTime = stylistTime + customerTime;
  const ratio = totalTime > 0 ? (stylistTime / totalTime) * 100 : 50;

  let score = 60;
  if (ratio >= 35 && ratio <= 45) score = 100;
  else if (ratio >= 30 && ratio <= 50) score = 80;
  else if (ratio >= 25 && ratio <= 55) score = 60;
  else score = 40;

  return {
    value: ratio,
    score,
    details: {
      stylistSeconds: stylistTime,
      customerSeconds: customerTime,
      totalSeconds: totalTime,
      ratio,
    },
  };
}

async function analyzeQuestions(conversationData: any[]) {
  // ローカル処理: 質問パターン検出
  const questionPatterns = [
    /[？?]$/,
    /^(どう|何|いつ|どこ|誰|なぜ|どれ|どの)/,
    /でしょうか/,
    /ますか/,
    /ですか/,
  ];

  const stylistUtterances = conversationData.filter(d => d.speaker === 'stylist');
  let totalQuestions = 0;
  let openQuestions = 0;
  const questionList: any[] = [];

  const openPatterns = [
    /^(どう|どのよう|何が|どんな)/,
    /について/,
    /感じ/,
  ];

  for (const utterance of stylistUtterances) {
    const isQuestion = questionPatterns.some(p => p.test(utterance.text));
    if (isQuestion) {
      totalQuestions++;
      const isOpen = openPatterns.some(p => p.test(utterance.text));
      if (isOpen) openQuestions++;
      questionList.push({
        text: utterance.text,
        type: isOpen ? 'open' : 'closed',
        time: utterance.startTime,
      });
    }
  }

  const openRatio = totalQuestions > 0 ? (openQuestions / totalQuestions) * 100 : 0;

  let score = 40;
  if (totalQuestions >= 8 && totalQuestions <= 12 && openRatio >= 60) score = 100;
  else if (totalQuestions >= 6 && totalQuestions <= 14 && openRatio >= 50) score = 80;
  else if (totalQuestions >= 4 && totalQuestions <= 16 && openRatio >= 40) score = 60;

  return {
    value: totalQuestions,
    score,
    details: {
      totalQuestions,
      openQuestions,
      closedQuestions: totalQuestions - openQuestions,
      openRatio,
      questionList,
    },
  };
}

async function analyzeEmotion(conversationData: any[]) {
  // Claude APIを使用した感情分析
  const customerUtterances = conversationData
    .filter(d => d.speaker === 'customer')
    .map(d => d.text)
    .join('\n');

  if (!customerUtterances) {
    return { value: 50, score: 50, details: { positiveRatio: 50, keywords: [], overall: 'neutral' } };
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `以下のお客様の発話を感情分析してください。

発話:
${customerUtterances}

JSONで回答してください:
{
  "positiveRatio": 0-100の数値,
  "keywords": ["ポジティブまたはネガティブなキーワード"],
  "overall": "positive" | "neutral" | "negative"
}`,
      }],
    }),
  });

  const result = await response.json();
  const analysisText = result.content[0].text;
  
  try {
    const analysis = JSON.parse(analysisText);
    let score = 50;
    if (analysis.positiveRatio >= 70) score = 100;
    else if (analysis.positiveRatio >= 60) score = 80;
    else if (analysis.positiveRatio >= 50) score = 60;
    else score = 40;

    return {
      value: analysis.positiveRatio,
      score,
      details: analysis,
    };
  } catch {
    return { value: 50, score: 50, details: { positiveRatio: 50, keywords: [], overall: 'neutral' } };
  }
}

async function detectConcerns(conversationData: any[], concernKeywords: string[]) {
  const customerText = conversationData
    .filter(d => d.speaker === 'customer')
    .map(d => d.text)
    .join(' ');

  const detected: string[] = [];
  const detectedAt: number[] = [];

  for (const keyword of concernKeywords) {
    if (customerText.includes(keyword)) {
      detected.push(keyword);
      // 検出時刻を特定
      const match = conversationData.find(
        d => d.speaker === 'customer' && d.text.includes(keyword)
      );
      if (match) detectedAt.push(match.startTime);
    }
  }

  return {
    value: detected.length > 0 ? 1 : 0,
    score: detected.length > 0 ? 100 : 50,
    details: {
      detected: detected.length > 0,
      detectedKeywords: detected,
      detectedAt,
      context: customerText.substring(0, 200),
    },
  };
}

async function analyzeProposalTiming(conversationData: any[]) {
  // 提案タイミング分析（詳細はPart 6参照）
  return {
    value: 0,
    score: 50,
    details: {
      concernDetectedAt: null,
      proposalAt: null,
      timingMinutes: null,
    },
  };
}

async function analyzeProposalQuality(conversationData: any[]) {
  // 提案品質分析（詳細はPart 6参照）
  return {
    value: 0,
    score: 50,
    details: {
      hasProposal: false,
      benefitRatio: 0,
      proposalDetails: [],
    },
  };
}

async function detectConversion(conversationData: any[]) {
  // 成約検出（詳細はPart 6参照）
  return {
    value: 0,
    score: 50,
    details: {
      converted: false,
      productName: null,
    },
  };
}

function calculateOverallScore(analyses: any[]) {
  const weights: Record<string, number> = {
    talk_ratio: 0.15,
    question_analysis: 0.15,
    emotion_analysis: 0.15,
    concern_keywords: 0.10,
    proposal_timing: 0.15,
    proposal_quality: 0.15,
    conversion: 0.15,
  };

  let totalScore = 0;
  for (const analysis of analyses) {
    totalScore += analysis.score * weights[analysis.indicatorType];
  }
  
  return Math.round(totalScore);
}

function mergeTranscriptsWithSpeakers(transcripts: any[], segments: any[]) {
  // 実装省略（Part 1のドメインサービス参照）
  return [];
}

function errorResponse(code: string, message: string, status: number) {
  return new Response(
    JSON.stringify({ error: { code, message } }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}
```

---

#### 3.3.5 search-cases

**エンドポイント**: `POST /functions/v1/search-cases`

**説明**: 悩みキーワードに基づいて類似の成功事例を検索

**リクエスト**:

```typescript
interface SearchCasesRequest {
  sessionId: string;
  concernKeywords: string[];
  customerInfo?: {
    ageGroup?: string;
    gender?: string;
  };
}
```

**レスポンス**:

```typescript
// 200 OK
interface SearchCasesResponse {
  data: {
    cases: Array<{
      id: string;
      concernKeywords: string[];
      successfulTalk: string;
      keyTactics: string[];
      soldProduct: string | null;
      similarity: number;
    }>;
    notificationSent: boolean;
  };
}
```

**実装**:

```typescript
// supabase/functions/search-cases/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { sessionId, concernKeywords, customerInfo } = await req.json();

    // セッション取得
    const { data: session } = await supabase
      .from('sessions')
      .select('salon_id')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return errorResponse('SES_001', 'セッションが見つかりません', 404);
    }

    // 検索テキスト生成
    const searchText = generateSearchText(concernKeywords, customerInfo);

    // Embedding生成
    const embedding = await createEmbedding(searchText);

    // ベクトル検索（pgvector）
    const { data: cases, error: searchError } = await supabase.rpc(
      'search_success_cases',
      {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 5,
        salon_id: session.salon_id,
      }
    );

    if (searchError) {
      console.error('Search error:', searchError);
      // フォールバック: キーワード検索
      const { data: fallbackCases } = await supabase
        .from('success_cases')
        .select('*')
        .or(`salon_id.eq.${session.salon_id},is_public.eq.true`)
        .overlaps('concern_keywords', concernKeywords)
        .limit(5);

      return sendNotificationAndRespond(supabase, sessionId, fallbackCases || []);
    }

    return sendNotificationAndRespond(supabase, sessionId, cases || []);

  } catch (error) {
    console.error('Search cases error:', error);
    return errorResponse('SYS_001', 'システムエラーが発生しました', 500);
  }
});

async function createEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  const result = await response.json();
  return result.data[0].embedding;
}

function generateSearchText(keywords: string[], customerInfo?: any): string {
  const parts = [`悩み: ${keywords.join(', ')}`];
  
  if (customerInfo?.ageGroup) {
    parts.push(`年代: ${customerInfo.ageGroup}`);
  }
  if (customerInfo?.gender) {
    parts.push(`性別: ${customerInfo.gender}`);
  }
  
  return parts.join('\n');
}

async function sendNotificationAndRespond(
  supabase: any,
  sessionId: string,
  cases: any[]
) {
  if (cases.length > 0) {
    // Realtimeで通知を送信
    await supabase
      .channel(`session:${sessionId}`)
      .send({
        type: 'broadcast',
        event: 'notification',
        payload: {
          type: 'proposal_chance',
          title: '🎯 提案チャンス！',
          message: `お客様が悩みを話しています`,
          recommendedProduct: cases[0].sold_product,
          successTalk: cases[0].successful_talk,
          keyTactics: cases[0].key_tactics,
        },
      });
  }

  return new Response(
    JSON.stringify({
      data: {
        cases: cases.map(c => ({
          id: c.id,
          concernKeywords: c.concern_keywords,
          successfulTalk: c.successful_talk,
          keyTactics: c.key_tactics,
          soldProduct: c.sold_product,
          similarity: c.similarity || null,
        })),
        notificationSent: cases.length > 0,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

function errorResponse(code: string, message: string, status: number) {
  return new Response(
    JSON.stringify({ error: { code, message } }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}
```

---

#### 3.3.6 generate-report

**エンドポイント**: `POST /functions/v1/generate-report`

**説明**: セッション終了時にAIレポートを生成

**リクエスト**:

```typescript
interface GenerateReportRequest {
  sessionId: string;
}
```

**レスポンス**:

```typescript
// 200 OK
interface GenerateReportResponse {
  data: {
    reportId: string;
    overallScore: number;
    goodPoints: string[];
    improvementPoints: string[];
    actionItems: string[];
    transcriptSummary: string;
    aiFeedback: string;
  };
}
```

**実装**:

```typescript
// supabase/functions/generate-report/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { sessionId } = await req.json();

    // セッション取得
    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return errorResponse('SES_001', 'セッションが見つかりません', 404);
    }

    // 全分析結果を取得
    const { data: analyses } = await supabase
      .from('session_analyses')
      .select('*')
      .eq('session_id', sessionId)
      .order('chunk_index', { ascending: false });

    // 最新の分析結果を指標ごとに取得
    const latestAnalyses = new Map<string, any>();
    for (const analysis of analyses || []) {
      if (!latestAnalyses.has(analysis.indicator_type)) {
        latestAnalyses.set(analysis.indicator_type, analysis);
      }
    }

    // 文字起こし全文取得
    const { data: transcripts } = await supabase
      .from('transcripts')
      .select('text')
      .eq('session_id', sessionId)
      .order('chunk_index');

    const fullTranscript = transcripts?.map(t => t.text).join(' ') || '';

    // 総合スコア計算
    const overallScore = calculateOverallScore(latestAnalyses);

    // Claude APIでレポート生成
    const reportContent = await generateReportWithAI(
      fullTranscript,
      latestAnalyses,
      overallScore
    );

    // レポート保存
    const indicatorScores: Record<string, { score: number; value: number }> = {};
    for (const [type, analysis] of latestAnalyses) {
      indicatorScores[type] = {
        score: analysis.score,
        value: analysis.value,
      };
    }

    const { data: report, error: reportError } = await supabase
      .from('session_reports')
      .insert({
        session_id: sessionId,
        overall_score: overallScore,
        good_points: reportContent.goodPoints,
        improvement_points: reportContent.improvementPoints,
        action_items: reportContent.actionItems,
        transcript_summary: reportContent.transcriptSummary,
        ai_feedback: reportContent.aiFeedback,
        indicator_scores: indicatorScores,
      })
      .select()
      .single();

    if (reportError) {
      throw reportError;
    }

    // セッションステータスを完了に
    await supabase
      .from('sessions')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', sessionId);

    return new Response(
      JSON.stringify({
        data: {
          reportId: report.id,
          overallScore,
          goodPoints: reportContent.goodPoints,
          improvementPoints: reportContent.improvementPoints,
          actionItems: reportContent.actionItems,
          transcriptSummary: reportContent.transcriptSummary,
          aiFeedback: reportContent.aiFeedback,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Report generation error:', error);
    return errorResponse('SYS_001', 'システムエラーが発生しました', 500);
  }
});

async function generateReportWithAI(
  transcript: string,
  analyses: Map<string, any>,
  overallScore: number
) {
  const analysisData = Object.fromEntries(analyses);

  const prompt = `あなたは美容室のセッションアナリストです。以下の会話分析結果に基づいて、レポートを生成してください。

## 会話内容（一部）
${transcript.substring(0, 2000)}...

## 分析結果
- 総合スコア: ${overallScore}点
- トーク比率: ${analysisData.talk_ratio?.score || 'N/A'}点
- 質問分析: ${analysisData.question_analysis?.score || 'N/A'}点
- 感情分析: ${analysisData.emotion_analysis?.score || 'N/A'}点
- 悩み検出: ${analysisData.concern_keywords?.details?.detected ? '検出あり' : '検出なし'}
- 提案品質: ${analysisData.proposal_quality?.score || 'N/A'}点
- 成約: ${analysisData.conversion?.details?.converted ? 'あり' : 'なし'}

## 出力形式（JSON）
{
  "goodPoints": ["良かった点を2-3個"],
  "improvementPoints": ["改善ポイントを2-3個"],
  "actionItems": ["次回への具体的なアクションを3個"],
  "transcriptSummary": "会話の要約（100文字程度）",
  "aiFeedback": "総合的なフィードバック（200文字程度）"
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const result = await response.json();
  const content = result.content[0].text;

  try {
    return JSON.parse(content);
  } catch {
    // パース失敗時のフォールバック
    return {
      goodPoints: ['お客様との会話を行いました'],
      improvementPoints: ['分析データを確認してください'],
      actionItems: ['次回のセッションで改善を意識しましょう'],
      transcriptSummary: '会話が行われました',
      aiFeedback: 'レポート生成中にエラーが発生しました。',
    };
  }
}

function calculateOverallScore(analyses: Map<string, any>): number {
  const weights: Record<string, number> = {
    talk_ratio: 0.15,
    question_analysis: 0.15,
    emotion_analysis: 0.15,
    concern_keywords: 0.10,
    proposal_timing: 0.15,
    proposal_quality: 0.15,
    conversion: 0.15,
  };

  let totalScore = 0;
  let totalWeight = 0;

  for (const [type, analysis] of analyses) {
    if (weights[type]) {
      totalScore += analysis.score * weights[type];
      totalWeight += weights[type];
    }
  }

  return totalWeight > 0 ? Math.round(totalScore / totalWeight * 100) / 100 : 0;
}

function errorResponse(code: string, message: string, status: number) {
  return new Response(
    JSON.stringify({ error: { code, message } }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}
```

---

#### 3.3.7 roleplay-chat

**エンドポイント**: `POST /functions/v1/roleplay-chat`

**説明**: AIロールプレイでお客様役の応答を生成

**リクエスト**:

```typescript
interface RoleplayChatRequest {
  scenarioId: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  userMessage: string;
}
```

**レスポンス**:

```typescript
// 200 OK
interface RoleplayChatResponse {
  data: {
    response: string;
    evaluation?: {
      score: number;
      feedback: string;
    };
    isComplete: boolean;
  };
}
```

---

### 3.4 データベース関数（RPC）

#### 3.4.1 search_success_cases

```sql
-- ベクトル類似検索関数
CREATE OR REPLACE FUNCTION search_success_cases(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  salon_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  concern_keywords TEXT[],
  successful_talk TEXT,
  key_tactics TEXT[],
  sold_product VARCHAR,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.concern_keywords,
    sc.successful_talk,
    sc.key_tactics,
    sc.sold_product,
    1 - (sc.embedding <=> query_embedding) AS similarity
  FROM success_cases sc
  WHERE
    sc.embedding IS NOT NULL
    AND (sc.is_public = true OR sc.salon_id = search_success_cases.salon_id)
    AND 1 - (sc.embedding <=> query_embedding) > match_threshold
  ORDER BY sc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

#### 3.4.2 get_staff_statistics

```sql
-- スタッフ統計取得関数
CREATE OR REPLACE FUNCTION get_staff_statistics(
  staff_id UUID,
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_sessions BIGINT,
  avg_score NUMERIC,
  conversion_rate NUMERIC,
  total_duration_minutes BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(s.id) AS total_sessions,
    COALESCE(AVG(sr.overall_score), 0) AS avg_score,
    COALESCE(
      SUM(CASE WHEN sa.details->>'converted' = 'true' THEN 1 ELSE 0 END)::NUMERIC / 
      NULLIF(COUNT(DISTINCT s.id), 0),
      0
    ) AS conversion_rate,
    COALESCE(
      SUM(EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) / 60)::BIGINT,
      0
    ) AS total_duration_minutes
  FROM sessions s
  LEFT JOIN session_reports sr ON sr.session_id = s.id
  LEFT JOIN session_analyses sa ON sa.session_id = s.id AND sa.indicator_type = 'conversion'
  WHERE
    s.stylist_id = get_staff_statistics.staff_id
    AND s.status = 'completed'
    AND s.started_at >= start_date
    AND s.started_at <= end_date
  GROUP BY s.stylist_id;
END;
$$;
```

---

（続きは Part 3 に記載: シーケンス図詳細、状態遷移設計）
# 詳細設計書 Part 3: シーケンス図詳細・状態遷移設計

---

## 4. シーケンス図詳細

### 4.1 セッションライフサイクル

#### 4.1.1 セッション開始シーケンス

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           セッション開始 詳細シーケンス                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  iPad  │ │ Zustand │ │ Speech   │ │  Edge    │ │ Supabase │ │ Realtime │           │
│  │  App   │ │  Store  │ │ Service  │ │ Function │ │    DB    │ │ Channel  │           │
│  └───┬────┘ └────┬────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│      │           │           │            │            │            │                  │
│      │ 1. タップ「セッション開始」          │            │            │                  │
│      │───────────────────────────────────▶│            │            │                  │
│      │           │           │            │            │            │                  │
│      │           │ 2. openSessionModal()  │            │            │                  │
│      │           │◀──────────────────────│            │            │                  │
│      │           │           │            │            │            │                  │
│      │  3. モーダル表示（お客様情報入力）   │            │            │                  │
│      │◀──────────│           │            │            │            │                  │
│      │           │           │            │            │            │                  │
│      │ 4. お客様情報入力 → 「開始」タップ  │            │            │                  │
│      │───────────────────────────────────▶│            │            │                  │
│      │           │           │            │            │            │                  │
│      │           │ 5. checkMicPermission()│            │            │                  │
│      │           │──────────▶│            │            │            │                  │
│      │           │           │            │            │            │                  │
│      │           │           │ 6. AVAudioSession                     │                  │
│      │           │           │    .requestRecordPermission()         │                  │
│      │           │           │────────────────────────────────────────────────────────▶│
│      │           │           │            │            │            │                  │
│      │           │           │ 7. Permission Granted                 │                  │
│      │           │           │◀────────────────────────────────────────────────────────│
│      │           │           │            │            │            │                  │
│      │           │ 8. { granted: true }   │            │            │                  │
│      │           │◀──────────│            │            │            │                  │
│      │           │           │            │            │            │                  │
│      │           │ 9. setLoading(true)    │            │            │                  │
│      │           │──────────────────────▶│            │            │                  │
│      │           │           │            │            │            │                  │
│      │           │ 10. POST /create-session            │            │                  │
│      │           │───────────────────────▶│            │            │                  │
│      │           │           │            │            │            │                  │
│      │           │           │            │ 11. Validate Request     │                  │
│      │           │           │            │──────────────────────────▶                  │
│      │           │           │            │            │            │                  │
│      │           │           │            │ 12. Check Active Session │                  │
│      │           │           │            │───────────▶│            │                  │
│      │           │           │            │            │            │                  │
│      │           │           │            │ 13. No Active Session    │                  │
│      │           │           │            │◀───────────│            │                  │
│      │           │           │            │            │            │                  │
│      │           │           │            │ 14. INSERT sessions      │                  │
│      │           │           │            │───────────▶│            │                  │
│      │           │           │            │            │            │                  │
│      │           │           │            │ 15. { id, started_at, ...}                 │
│      │           │           │            │◀───────────│            │                  │
│      │           │           │            │            │            │                  │
│      │           │ 16. Response { sessionId, realtimeChannel }       │                  │
│      │           │◀──────────────────────│            │            │                  │
│      │           │           │            │            │            │                  │
│      │           │ 17. setSession(session)│            │            │                  │
│      │           │──────────────────────────────────────────────────▶                  │
│      │           │           │            │            │            │                  │
│      │           │ 18. supabase.channel(realtimeChannel)             │                  │
│      │           │──────────────────────────────────────────────────▶│                  │
│      │           │           │            │            │            │                  │
│      │           │           │            │            │ 19. Subscribe                  │
│      │           │           │            │            │────────────▶│                  │
│      │           │           │            │            │            │                  │
│      │           │           │            │            │ 20. Subscribed                 │
│      │           │           │            │            │◀────────────│                  │
│      │           │           │            │            │            │                  │
│      │           │ 21. Channel Ready      │            │            │                  │
│      │           │◀──────────────────────────────────────────────────│                  │
│      │           │           │            │            │            │                  │
│      │           │ 22. initializeRecording()           │            │                  │
│      │           │──────────▶│            │            │            │                  │
│      │           │           │            │            │            │                  │
│      │           │           │ 23. AVAudioEngine.start()             │                  │
│      │           │           │──────────────────────────────────────▶│                  │
│      │           │           │            │            │            │                  │
│      │           │           │ 24. SpeechAnalyzer.start()            │                  │
│      │           │           │──────────────────────────────────────▶│                  │
│      │           │           │            │            │            │                  │
│      │           │ 25. { recording: true }│            │            │                  │
│      │           │◀──────────│            │            │            │                  │
│      │           │           │            │            │            │                  │
│      │           │ 26. setRecording(true) │            │            │                  │
│      │           │──────────────────────▶│            │            │                  │
│      │           │           │            │            │            │                  │
│      │ 27. Navigate to SessionScreen      │            │            │                  │
│      │◀──────────│           │            │            │            │                  │
│      │           │           │            │            │            │                  │
│      │  [セッション画面表示]  │            │            │            │                  │
│      │           │           │            │            │            │                  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 4.1.2 リアルタイム分析シーケンス

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         リアルタイム分析 詳細シーケンス                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  iPad  │ │ Speech   │ │ process- │ │ pyannote │ │ analyze- │ │ Realtime │          │
│  │  App   │ │ Service  │ │  audio   │ │  Server  │ │ segment  │ │ Channel  │          │
│  └───┬────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│      │           │            │            │            │            │                 │
│      │  ════════════════ 60秒経過（チャンク生成）════════════════    │                 │
│      │           │            │            │            │            │                 │
│      │ 1. onAudioChunk(buffer, transcripts)│            │            │                 │
│      │◀──────────│            │            │            │            │                 │
│      │           │            │            │            │            │                 │
│      │ 2. Convert to WAV      │            │            │            │                 │
│      │──────────▶│            │            │            │            │                 │
│      │           │            │            │            │            │                 │
│      │ 3. WAV File + Transcripts           │            │            │                 │
│      │◀──────────│            │            │            │            │                 │
│      │           │            │            │            │            │                 │
│      │ 4. Save to Local DB (offline backup)│            │            │                 │
│      │───────────────────────────────────▶ │            │            │                 │
│      │           │            │            │            │            │                 │
│      │ 5. POST /process-audio (multipart)  │            │            │                 │
│      │───────────────────────▶│            │            │            │                 │
│      │           │            │            │            │            │                 │
│      │           │            │ 6. Validate (session, size)          │                 │
│      │           │            │──────────────────────────────────────▶                 │
│      │           │            │            │            │            │                 │
│      │           │            │ 7. Upload WAV to Storage             │                 │
│      │           │            │──────────────────────────────────────▶                 │
│      │           │            │            │            │            │                 │
│      │           │            │ 8. Storage URL                       │                 │
│      │           │            │◀──────────────────────────────────────                 │
│      │           │            │            │            │            │                 │
│      │           │            │ 9. INSERT transcripts                │                 │
│      │           │            │──────────────────────────────────────▶                 │
│      │           │            │            │            │            │                 │
│      │           │            │ 10. POST /diarize/{session_id}       │                 │
│      │           │            │───────────▶│            │            │                 │
│      │           │            │            │            │            │                 │
│      │           │            │ 11. { status: "processing" }         │                 │
│      │           │            │◀───────────│            │            │                 │
│      │           │            │            │            │            │                 │
│      │ 12. Response { transcriptId, audioUrl, diarizationTriggered } │                 │
│      │◀──────────────────────│            │            │            │                 │
│      │           │            │            │            │            │                 │
│      │           │            │            │ ┌─────────────────────┐ │                 │
│      │           │            │            │ │ 13. pyannote処理    │ │                 │
│      │           │            │            │ │     (GPU, 非同期)   │ │                 │
│      │           │            │            │ │                     │ │                 │
│      │           │            │            │ │ - Load Audio        │ │                 │
│      │           │            │            │ │ - Diarization       │ │                 │
│      │           │            │            │ │ - Speaker Labels    │ │                 │
│      │           │            │            │ └──────────┬──────────┘ │                 │
│      │           │            │            │            │            │                 │
│      │           │            │            │ 14. POST /diarization-callback            │
│      │           │            │◀───────────│            │            │                 │
│      │           │            │            │            │            │                 │
│      │           │            │ 15. INSERT speaker_segments          │                 │
│      │           │            │──────────────────────────────────────▶                 │
│      │           │            │            │            │            │                 │
│      │           │            │ 16. POST /analyze-segment            │                 │
│      │           │            │────────────────────────▶│            │                 │
│      │           │            │            │            │            │                 │
│      │           │            │            │            │ 17. Get Transcripts          │
│      │           │            │            │            │──────────────────────────────▶
│      │           │            │            │            │            │                 │
│      │           │            │            │            │ 18. Get Speaker Segments     │
│      │           │            │            │            │──────────────────────────────▶
│      │           │            │            │            │            │                 │
│      │           │            │            │            │ 19. Merge & Analyze          │
│      │           │            │            │            │ ┌────────────────────────────┐
│      │           │            │            │            │ │ - Talk Ratio (local)      │
│      │           │            │            │            │ │ - Questions (local)       │
│      │           │            │            │            │ │ - Emotion (Claude API)    │
│      │           │            │            │            │ │ - Concerns (local+Claude) │
│      │           │            │            │            │ │ - Proposal (Claude API)   │
│      │           │            │            │            │ │ - Conversion (Claude API) │
│      │           │            │            │            │ └────────────────────────────┘
│      │           │            │            │            │            │                 │
│      │           │            │            │            │ 20. INSERT session_analyses  │
│      │           │            │            │            │──────────────────────────────▶
│      │           │            │            │            │            │                 │
│      │           │            │            │            │ 21. Broadcast 'analysis'     │
│      │           │            │            │            │───────────▶│                 │
│      │           │            │            │            │            │                 │
│      │ 22. onAnalysis(payload)│            │            │            │                 │
│      │◀──────────────────────────────────────────────────────────────│                 │
│      │           │            │            │            │            │                 │
│      │ 23. Update UI (scores, log)         │            │            │                 │
│      │───────────────────────▶│            │            │            │                 │
│      │           │            │            │            │            │                 │
│      │  ════════════════ 悩みキーワード検出時 ════════════════       │                 │
│      │           │            │            │            │            │                 │
│      │           │            │            │            │ 24. POST /search-cases       │
│      │           │            │            │            │───────────▶│                 │
│      │           │            │            │            │            │                 │
│      │           │            │            │            │ 25. Vector Search            │
│      │           │            │            │            │──────────────────────────────▶
│      │           │            │            │            │            │                 │
│      │           │            │            │            │ 26. Top 5 Cases              │
│      │           │            │            │            │◀──────────────────────────────
│      │           │            │            │            │            │                 │
│      │           │            │            │            │ 27. Broadcast 'notification' │
│      │           │            │            │            │───────────▶│                 │
│      │           │            │            │            │            │                 │
│      │ 28. onNotification(payload)         │            │            │                 │
│      │◀──────────────────────────────────────────────────────────────│                 │
│      │           │            │            │            │            │                 │
│      │ 29. Show Proposal Card │            │            │            │                 │
│      │───────────────────────▶│            │            │            │                 │
│      │           │            │            │            │            │                 │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 4.1.3 セッション終了・レポート生成シーケンス

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                      セッション終了・レポート生成 詳細シーケンス                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  iPad  │ │ Zustand │ │ Speech   │ │  end-    │ │ generate-│ │   Claude │           │
│  │  App   │ │  Store  │ │ Service  │ │ session  │ │  report  │ │    API   │           │
│  └───┬────┘ └────┬────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│      │           │           │            │            │            │                  │
│      │ 1. タップ「セッション終了」         │            │            │                  │
│      │───────────────────────────────────▶│            │            │                  │
│      │           │           │            │            │            │                  │
│      │  2. 確認ダイアログ表示 │            │            │            │                  │
│      │◀──────────│           │            │            │            │                  │
│      │           │           │            │            │            │                  │
│      │ 3. 「終了する」タップ  │            │            │            │                  │
│      │───────────────────────────────────▶│            │            │                  │
│      │           │           │            │            │            │                  │
│      │           │ 4. setLoading(true)    │            │            │                  │
│      │           │──────────────────────▶│            │            │                  │
│      │           │           │            │            │            │                  │
│      │           │ 5. stopRecording()     │            │            │                  │
│      │           │──────────▶│            │            │            │                  │
│      │           │           │            │            │            │                  │
│      │           │           │ 6. AVAudioEngine.stop()               │                  │
│      │           │           │──────────────────────────────────────▶│                  │
│      │           │           │            │            │            │                  │
│      │           │           │ 7. Process remaining buffer           │                  │
│      │           │           │──────────────────────────────────────▶│                  │
│      │           │           │            │            │            │                  │
│      │           │           │ 8. Final transcript                   │                  │
│      │           │           │◀──────────────────────────────────────│                  │
│      │           │           │            │            │            │                  │
│      │           │ 9. Upload final chunk (if any)      │            │                  │
│      │           │──────────────────────▶│            │            │                  │
│      │           │           │            │            │            │                  │
│      │           │ 10. POST /end-session  │            │            │                  │
│      │           │───────────────────────▶│            │            │                  │
│      │           │           │            │            │            │                  │
│      │           │           │            │ 11. UPDATE sessions      │                  │
│      │           │           │            │     SET status='processing'                │
│      │           │           │            │──────────────────────────▶                  │
│      │           │           │            │            │            │                  │
│      │           │           │            │ 12. Wait for pending diarization           │
│      │           │           │            │──────────────────────────▶                  │
│      │           │           │            │            │            │                  │
│      │           │           │            │ 13. POST /generate-report│                  │
│      │           │           │            │────────────▶│            │                  │
│      │           │           │            │            │            │                  │
│      │           │           │            │            │ 14. GET all analyses          │
│      │           │           │            │            │──────────────────────────────▶ │
│      │           │           │            │            │            │                  │
│      │           │           │            │            │ 15. GET all transcripts       │
│      │           │           │            │            │──────────────────────────────▶ │
│      │           │           │            │            │            │                  │
│      │           │           │            │            │ 16. Calculate overall score   │
│      │           │           │            │            │──────────────────────────────▶ │
│      │           │           │            │            │            │                  │
│      │           │           │            │            │ 17. POST /v1/messages         │
│      │           │           │            │            │───────────▶│                  │
│      │           │           │            │            │            │                  │
│      │           │           │            │            │            │ 18. Generate     │
│      │           │           │            │            │            │     Report       │
│      │           │           │            │            │            │     Content      │
│      │           │           │            │            │            │                  │
│      │           │           │            │            │ 19. AI Response              │
│      │           │           │            │            │◀───────────│                  │
│      │           │           │            │            │            │                  │
│      │           │           │            │            │ 20. Parse & Format           │
│      │           │           │            │            │──────────────────────────────▶ │
│      │           │           │            │            │            │                  │
│      │           │           │            │            │ 21. INSERT session_reports   │
│      │           │           │            │            │──────────────────────────────▶ │
│      │           │           │            │            │            │                  │
│      │           │           │            │            │ 22. UPDATE sessions          │
│      │           │           │            │            │     SET status='completed'   │
│      │           │           │            │            │──────────────────────────────▶ │
│      │           │           │            │            │            │                  │
│      │           │           │            │ 23. Response { reportId, ... }             │
│      │           │           │            │◀───────────│            │                  │
│      │           │           │            │            │            │                  │
│      │           │ 24. Response { success, report }    │            │                  │
│      │           │◀──────────────────────│            │            │                  │
│      │           │           │            │            │            │                  │
│      │           │ 25. setSession({ status: 'completed', report })  │                  │
│      │           │──────────────────────────────────────────────────▶                  │
│      │           │           │            │            │            │                  │
│      │           │ 26. setLoading(false)  │            │            │                  │
│      │           │──────────────────────▶│            │            │                  │
│      │           │           │            │            │            │                  │
│      │ 27. Navigate to ReportScreen       │            │            │                  │
│      │◀──────────│           │            │            │            │                  │
│      │           │           │            │            │            │                  │
│      │  [レポート画面表示]    │            │            │            │                  │
│      │           │           │            │            │            │                  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 認証シーケンス

#### 4.2.1 ログインシーケンス

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              ログイン 詳細シーケンス                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                         │
│  │  iPad  │ │ Zustand │ │ Supabase │ │ Supabase │ │  Secure  │                         │
│  │  App   │ │  Store  │ │   Auth   │ │    DB    │ │ Storage  │                         │
│  └───┬────┘ └────┬────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘                         │
│      │           │           │            │            │                                │
│      │ 1. Enter email & password          │            │                                │
│      │───────────────────────────────────▶│            │                                │
│      │           │           │            │            │                                │
│      │           │ 2. Validate input      │            │                                │
│      │           │──────────────────────▶│            │                                │
│      │           │           │            │            │                                │
│      │           │ 3. signInWithPassword()│            │                                │
│      │           │──────────▶│            │            │                                │
│      │           │           │            │            │                                │
│      │           │           │ 4. Verify credentials   │                                │
│      │           │           │───────────▶│            │                                │
│      │           │           │            │            │                                │
│      │           │           │ 5. User exists + password match       │                  │
│      │           │           │◀───────────│            │                                │
│      │           │           │            │            │                                │
│      │           │           │ 6. Generate JWT tokens  │                                │
│      │           │           │──────────────────────────────────────▶                   │
│      │           │           │            │            │                                │
│      │           │           │ 7. { access_token, refresh_token, user }                 │
│      │           │◀──────────│            │            │                                │
│      │           │           │            │            │                                │
│      │           │ 8. Store refresh_token │            │                                │
│      │           │──────────────────────────────────────────────────▶│                  │
│      │           │           │            │            │                                │
│      │           │ 9. Get staff info      │            │                                │
│      │           │──────────▶│            │            │                                │
│      │           │           │            │            │                                │
│      │           │           │ 10. SELECT * FROM staffs WHERE auth_user_id = ?          │
│      │           │           │───────────▶│            │                                │
│      │           │           │            │            │                                │
│      │           │           │ 11. Staff data with salon info        │                  │
│      │           │           │◀───────────│            │                                │
│      │           │           │            │            │                                │
│      │           │ 12. { user, staff, session }        │                                │
│      │           │◀──────────│            │            │                                │
│      │           │           │            │            │                                │
│      │           │ 13. setUser(user)      │            │                                │
│      │           │    setStaff(staff)     │            │                                │
│      │           │    setSession(session) │            │                                │
│      │           │──────────────────────▶│            │                                │
│      │           │           │            │            │                                │
│      │ 14. Navigate to HomeScreen         │            │                                │
│      │◀──────────│           │            │            │                                │
│      │           │           │            │            │                                │
│                                                                                         │
│  ════════════════ エラーケース ════════════════                                         │
│                                                                                         │
│  E1. 認証失敗（パスワード誤り）                                                          │
│      │           │           │            │            │                                │
│      │           │           │ 4a. Invalid credentials │                                │
│      │           │           │◀───────────│            │                                │
│      │           │           │            │            │                                │
│      │           │ 5a. Error: AUTH_001    │            │                                │
│      │           │◀──────────│            │            │                                │
│      │           │           │            │            │                                │
│      │ 6a. Show error message │            │            │                                │
│      │◀──────────│           │            │            │                                │
│      │           │           │            │            │                                │
│  E2. スタッフ無効                                                                        │
│      │           │           │            │            │                                │
│      │           │           │ 11b. staff.is_active = false          │                  │
│      │           │           │◀───────────│            │                                │
│      │           │           │            │            │                                │
│      │           │ 12b. Error: AUTH_003   │            │                                │
│      │           │◀──────────│            │            │                                │
│      │           │           │            │            │                                │
│      │ 13b. Show "アカウントが無効です"    │            │                                │
│      │◀──────────│           │            │            │                                │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 4.2.2 トークンリフレッシュシーケンス

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          トークンリフレッシュ シーケンス                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐                                      │
│  │  iPad  │ │   API   │ │ Supabase │ │  Secure  │                                      │
│  │  App   │ │ Client  │ │   Auth   │ │ Storage  │                                      │
│  └───┬────┘ └────┬────┘ └────┬─────┘ └────┬─────┘                                      │
│      │           │           │            │                                             │
│      │ 1. API Request        │            │                                             │
│      │──────────▶│           │            │                                             │
│      │           │           │            │                                             │
│      │           │ 2. Check token expiry  │                                             │
│      │           │──────────────────────▶│                                             │
│      │           │           │            │                                             │
│      │           │ 3. Token expired (< 5 min)          │                                │
│      │           │◀──────────────────────│                                             │
│      │           │           │            │                                             │
│      │           │ 4. Get refresh_token   │                                             │
│      │           │──────────────────────────────────────▶│                              │
│      │           │           │            │                                             │
│      │           │ 5. refresh_token       │                                             │
│      │           │◀──────────────────────────────────────│                              │
│      │           │           │            │                                             │
│      │           │ 6. refreshSession()    │                                             │
│      │           │──────────▶│            │                                             │
│      │           │           │            │                                             │
│      │           │           │ 7. Validate refresh_token             │                  │
│      │           │           │──────────────────────────────────────▶                   │
│      │           │           │            │                                             │
│      │           │           │ 8. Generate new tokens  │                                │
│      │           │           │──────────────────────────────────────▶                   │
│      │           │           │            │                                             │
│      │           │ 9. { new_access_token, new_refresh_token }        │                  │
│      │           │◀──────────│            │                                             │
│      │           │           │            │                                             │
│      │           │ 10. Store new refresh_token          │                               │
│      │           │──────────────────────────────────────▶│                              │
│      │           │           │            │                                             │
│      │           │ 11. Retry original request with new token         │                  │
│      │           │──────────▶│            │                                             │
│      │           │           │            │                                             │
│      │ 12. Response          │            │                                             │
│      │◀──────────│           │            │                                             │
│      │           │           │            │                                             │
│                                                                                         │
│  ════════════════ リフレッシュ失敗ケース ════════════════                                │
│                                                                                         │
│      │           │           │            │                                             │
│      │           │           │ 7a. Refresh token invalid/expired     │                  │
│      │           │           │◀──────────────────────────────────────                   │
│      │           │           │            │                                             │
│      │           │ 8a. Error: AUTH_002    │                                             │
│      │           │◀──────────│            │                                             │
│      │           │           │            │                                             │
│      │           │ 9a. Clear stored tokens│                                             │
│      │           │──────────────────────────────────────▶│                              │
│      │           │           │            │                                             │
│      │ 10a. Redirect to LoginScreen       │                                             │
│      │◀──────────│           │            │                                             │
│      │           │           │            │                                             │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. 状態遷移設計

### 5.1 セッション状態遷移

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              セッション状態遷移図                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│                                                                                         │
│                              ┌─────────────────┐                                        │
│                              │                 │                                        │
│                              │     (初期)      │                                        │
│                              │                 │                                        │
│                              └────────┬────────┘                                        │
│                                       │                                                 │
│                                       │ create-session                                  │
│                                       ▼                                                 │
│                              ┌─────────────────┐                                        │
│                              │                 │                                        │
│            ┌────────────────▶│   RECORDING     │◀────────────────┐                     │
│            │                 │                 │                 │                     │
│            │                 └────────┬────────┘                 │                     │
│            │                          │                          │                     │
│            │                          │ end-session              │                     │
│            │                          ▼                          │                     │
│            │                 ┌─────────────────┐                 │                     │
│            │                 │                 │                 │                     │
│            │                 │   PROCESSING    │─────────────────┤                     │
│            │                 │                 │                 │                     │
│            │                 └────────┬────────┘                 │                     │
│            │                          │                          │                     │
│            │            ┌─────────────┼─────────────┐            │                     │
│            │            │             │             │            │                     │
│            │            │ success     │             │ failure    │                     │
│            │            ▼             │             ▼            │                     │
│            │   ┌─────────────────┐    │    ┌─────────────────┐   │                     │
│            │   │                 │    │    │                 │   │                     │
│            │   │   COMPLETED     │    │    │     FAILED      │───┘                     │
│            │   │                 │    │    │                 │  retry                  │
│            │   └─────────────────┘    │    └─────────────────┘                         │
│            │                          │                                                 │
│            │                          │ timeout (5min)                                  │
│            │                          ▼                                                 │
│            │                 ┌─────────────────┐                                        │
│            │                 │                 │                                        │
│            └─────────────────│     FAILED      │                                        │
│              force_complete  │                 │                                        │
│                              └─────────────────┘                                        │
│                                                                                         │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ 状態            │ 説明                         │ 遷移条件                       │   │
│  ├─────────────────┼──────────────────────────────┼────────────────────────────────┤   │
│  │ RECORDING       │ 録音中、リアルタイム分析中    │ create-session API成功         │   │
│  │ PROCESSING      │ 終了処理中、レポート生成中    │ end-session API呼び出し        │   │
│  │ COMPLETED       │ 正常終了、レポート生成完了    │ generate-report API成功        │   │
│  │ FAILED          │ 異常終了                     │ エラー発生 or タイムアウト      │   │
│  └─────────────────┴──────────────────────────────┴────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 話者分離状態遷移

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            話者分離（Diarization）状態遷移図                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│                              ┌─────────────────┐                                        │
│                              │                 │                                        │
│                              │    PENDING      │◀──────────────┐                       │
│                              │                 │               │                       │
│                              └────────┬────────┘               │                       │
│                                       │                        │                       │
│                                       │ trigger_diarization    │ new_chunk             │
│                                       ▼                        │                       │
│                              ┌─────────────────┐               │                       │
│                              │                 │               │                       │
│                              │   PROCESSING    │───────────────┤                       │
│                              │                 │               │                       │
│                              └────────┬────────┘               │                       │
│                                       │                        │                       │
│                         ┌─────────────┼─────────────┐          │                       │
│                         │             │             │          │                       │
│                         │ callback    │             │ callback │                       │
│                         │ success     │             │ error    │                       │
│                         ▼             │             ▼          │                       │
│                ┌─────────────────┐    │    ┌─────────────────┐ │                       │
│                │                 │    │    │                 │ │                       │
│                │   COMPLETED     │    │    │     FAILED      │─┘                       │
│                │                 │    │    │                 │  retry (max 3)          │
│                └─────────────────┘    │    └─────────────────┘                         │
│                                       │                                                 │
│                                       │ timeout (5min)                                  │
│                                       ▼                                                 │
│                              ┌─────────────────┐                                        │
│                              │                 │                                        │
│                              │     FAILED      │                                        │
│                              │                 │                                        │
│                              └─────────────────┘                                        │
│                                                                                         │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ 状態            │ 説明                         │ 後続処理                       │   │
│  ├─────────────────┼──────────────────────────────┼────────────────────────────────┤   │
│  │ PENDING         │ 話者分離未実行               │ trigger_diarization待機        │   │
│  │ PROCESSING      │ pyannoteサーバーで処理中     │ callback待機                   │   │
│  │ COMPLETED       │ 話者分離完了                 │ analyze-segment実行            │   │
│  │ FAILED          │ 話者分離失敗                 │ スキップしてanalyze実行        │   │
│  └─────────────────┴──────────────────────────────┴────────────────────────────────┘   │
│                                                                                         │
│  失敗時のフォールバック:                                                                 │
│  - 話者分離なしで分析を実行                                                              │
│  - 全発話をスタイリストとして扱う                                                        │
│  - トーク比率は50:50として計算                                                          │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 ユーザー認証状態遷移

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              ユーザー認証状態遷移図                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│                              ┌─────────────────┐                                        │
│                              │                 │                                        │
│                              │  UNAUTHENTICATED│◀─────────────────────────────┐        │
│                              │                 │                              │        │
│                              └────────┬────────┘                              │        │
│                                       │                                       │        │
│                                       │ login_success                         │        │
│                                       ▼                                       │        │
│                              ┌─────────────────┐                              │        │
│                              │                 │                              │        │
│                  ┌──────────▶│  AUTHENTICATED  │◀─────────────┐              │        │
│                  │           │                 │              │              │        │
│                  │           └────────┬────────┘              │              │        │
│                  │                    │                       │              │        │
│                  │        ┌───────────┼───────────┐           │              │        │
│                  │        │           │           │           │              │        │
│                  │        │ token     │           │ logout    │              │        │
│                  │        │ expiring  │           │           │              │        │
│                  │        ▼           │           ▼           │              │        │
│         ┌─────────────────┐           │   ┌─────────────────┐ │              │        │
│         │                 │           │   │                 │ │              │        │
│         │   REFRESHING    │───────────┤   │   LOGGING_OUT   │─┼──────────────┘        │
│         │                 │  refresh  │   │                 │ │                       │
│         └────────┬────────┘  success  │   └─────────────────┘ │                       │
│                  │                    │                       │                       │
│                  │ refresh_failed     │                       │                       │
│                  ▼                    │                       │                       │
│         ┌─────────────────┐           │                       │                       │
│         │                 │           │                       │                       │
│         │  SESSION_EXPIRED│───────────┴───────────────────────┘                       │
│         │                 │                                                            │
│         └─────────────────┘                                                            │
│                                                                                         │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ 状態              │ UI表示                     │ 許可されるアクション           │   │
│  ├───────────────────┼────────────────────────────┼────────────────────────────────┤   │
│  │ UNAUTHENTICATED   │ ログイン画面               │ ログイン、パスワードリセット    │   │
│  │ AUTHENTICATED     │ メイン画面                 │ 全機能                         │   │
│  │ REFRESHING        │ ローディング表示           │ なし（待機）                   │   │
│  │ SESSION_EXPIRED   │ 再ログイン促すダイアログ    │ 再ログインのみ                 │   │
│  │ LOGGING_OUT       │ ローディング表示           │ なし（待機）                   │   │
│  └───────────────────┴────────────────────────────┴────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 アプリケーションUI状態

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         iPadアプリ UI状態遷移図                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   ┌───────────────────────────────────────────────────────────────────────────────┐    │
│   │                              AppNavigator                                     │    │
│   │                                                                               │    │
│   │   ┌─────────────────────────────────────────────────────────────────────────┐│    │
│   │   │                         AuthStack                                       ││    │
│   │   │                                                                         ││    │
│   │   │   ┌──────────────┐                                                      ││    │
│   │   │   │              │                                                      ││    │
│   │   │   │ LoginScreen  │                                                      ││    │
│   │   │   │              │                                                      ││    │
│   │   │   └──────┬───────┘                                                      ││    │
│   │   │          │ login_success                                                ││    │
│   │   │          ▼                                                              ││    │
│   │   └─────────────────────────────────────────────────────────────────────────┘│    │
│   │                                                                               │    │
│   │   ┌─────────────────────────────────────────────────────────────────────────┐│    │
│   │   │                         MainStack                                       ││    │
│   │   │                                                                         ││    │
│   │   │   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐   ││    │
│   │   │   │              │ start   │              │  end    │              │   ││    │
│   │   │   │  HomeScreen  │────────▶│SessionScreen │────────▶│ ReportScreen │   ││    │
│   │   │   │              │         │              │         │              │   ││    │
│   │   │   └──────┬───────┘         └──────────────┘         └──────────────┘   ││    │
│   │   │          │                                                              ││    │
│   │   │          │ reports                                                      ││    │
│   │   │          ▼                                                              ││    │
│   │   │   ┌──────────────┐         ┌──────────────┐                            ││    │
│   │   │   │              │ select  │              │                            ││    │
│   │   │   │ReportListScreen│──────▶│ ReportScreen │                            ││    │
│   │   │   │              │         │              │                            ││    │
│   │   │   └──────────────┘         └──────────────┘                            ││    │
│   │   │          │                                                              ││    │
│   │   │          │ training                                                     ││    │
│   │   │          ▼                                                              ││    │
│   │   │   ┌──────────────┐         ┌──────────────┐                            ││    │
│   │   │   │              │ select  │              │                            ││    │
│   │   │   │TrainingScreen│────────▶│RoleplayScreen│                            ││    │
│   │   │   │              │         │              │                            ││    │
│   │   │   └──────────────┘         └──────────────┘                            ││    │
│   │   │          │                                                              ││    │
│   │   │          │ settings                                                     ││    │
│   │   │          ▼                                                              ││    │
│   │   │   ┌──────────────┐                                                      ││    │
│   │   │   │              │                                                      ││    │
│   │   │   │SettingsScreen│                                                      ││    │
│   │   │   │              │                                                      ││    │
│   │   │   └──────────────┘                                                      ││    │
│   │   │                                                                         ││    │
│   │   └─────────────────────────────────────────────────────────────────────────┘│    │
│   │                                                                               │    │
│   └───────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                         │
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│   │ SessionScreen 内部状態遷移                                                      │  │
│   │                                                                                 │  │
│   │   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐               │  │
│   │   │          │    │          │    │          │    │          │               │  │
│   │   │INITIALIZING│──▶│ RECORDING│──▶│ ENDING   │──▶│ COMPLETE │               │  │
│   │   │          │    │          │    │          │    │          │               │  │
│   │   └──────────┘    └──────────┘    └──────────┘    └──────────┘               │  │
│   │        │               │                                                      │  │
│   │        │               │ notification                                         │  │
│   │        │               ▼                                                      │  │
│   │        │         ┌──────────┐                                                 │  │
│   │        │         │          │                                                 │  │
│   │        │         │ SHOWING  │  (overlay state)                                │  │
│   │        │         │NOTIFICATION                                                │  │
│   │        │         │          │                                                 │  │
│   │        │         └──────────┘                                                 │  │
│   │        │                                                                      │  │
│   │        │ error                                                                │  │
│   │        ▼                                                                      │  │
│   │   ┌──────────┐                                                                │  │
│   │   │          │                                                                │  │
│   │   │  ERROR   │                                                                │  │
│   │   │          │                                                                │  │
│   │   └──────────┘                                                                │  │
│   │                                                                                 │  │
│   └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.5 状態遷移表

#### 5.5.1 セッション状態遷移表

| 現状態 | イベント | 次状態 | アクション | 備考 |
|--------|---------|--------|-----------|------|
| (none) | create-session | RECORDING | DB INSERT, Realtime接続 | 新規セッション開始 |
| RECORDING | process-audio | RECORDING | チャンク処理 | 状態維持 |
| RECORDING | end-session | PROCESSING | ステータス更新 | 終了処理開始 |
| RECORDING | error | FAILED | エラーログ | 異常終了 |
| RECORDING | network_lost | RECORDING | オフラインキュー | ネットワーク復旧待ち |
| PROCESSING | generate-report.success | COMPLETED | レポート保存 | 正常終了 |
| PROCESSING | generate-report.failure | FAILED | エラーログ | レポート生成失敗 |
| PROCESSING | timeout(5min) | FAILED | 強制終了 | タイムアウト |
| FAILED | retry | PROCESSING | 再試行 | 最大3回 |
| FAILED | force_complete | COMPLETED | 簡易レポート | 強制完了 |

#### 5.5.2 話者分離状態遷移表

| 現状態 | イベント | 次状態 | アクション | 備考 |
|--------|---------|--------|-----------|------|
| PENDING | trigger | PROCESSING | pyannote呼び出し | 処理開始 |
| PROCESSING | callback.success | COMPLETED | セグメント保存 | 分析トリガー |
| PROCESSING | callback.failure | FAILED | エラーログ | リトライ判定 |
| PROCESSING | timeout(5min) | FAILED | タイムアウト | フォールバック |
| FAILED | retry (count < 3) | PENDING | リトライ | 最大3回 |
| FAILED | retry (count >= 3) | FAILED | スキップ | フォールバック分析 |
| COMPLETED | new_chunk | PENDING | 新規処理 | 次チャンク |

---

（続きは Part 4 に記載: アルゴリズム詳細設計）
# 詳細設計書 Part 4: アルゴリズム詳細設計

---

## 6. アルゴリズム詳細設計

### 6.1 分析指標計算アルゴリズム

#### 6.1.1 トーク比率（Talk Ratio）計算

**目的**: スタイリストとお客様の発話時間比率を計算し、理想的な比率（40:60）との乖離を評価

**入力**:
- `segments: SpeakerSegment[]` - 話者分離済みセグメント配列

**出力**:
- `score: number` - 0-100のスコア
- `value: number` - スタイリストの発話比率（%）
- `details: TalkRatioDetails` - 詳細データ

**アルゴリズム**:

```typescript
// src/domain/services/analysis/talkRatioAnalyzer.ts

interface TalkRatioResult {
  score: number;
  value: number;
  details: {
    stylistSeconds: number;
    customerSeconds: number;
    totalSeconds: number;
    ratio: number;
  };
}

/**
 * トーク比率分析
 * 
 * スコア計算ロジック:
 * - 理想比率: 40% (スタイリスト) : 60% (お客様)
 * - 35-45%: 100点（理想範囲）
 * - 30-35% or 45-50%: 80点（許容範囲）
 * - 25-30% or 50-55%: 60点（やや乖離）
 * - それ以外: 40点（大きく乖離）
 */
export function analyzeTalkRatio(segments: SpeakerSegment[]): TalkRatioResult {
  // 1. 話者別の発話時間を集計
  let stylistSeconds = 0;
  let customerSeconds = 0;

  for (const segment of segments) {
    const duration = segment.endTime - segment.startTime;
    
    if (segment.speaker === 'stylist') {
      stylistSeconds += duration;
    } else if (segment.speaker === 'customer') {
      customerSeconds += duration;
    }
    // 'unknown'は無視
  }

  const totalSeconds = stylistSeconds + customerSeconds;

  // 2. 発話がない場合のデフォルト処理
  if (totalSeconds === 0) {
    return {
      score: 50,
      value: 50,
      details: {
        stylistSeconds: 0,
        customerSeconds: 0,
        totalSeconds: 0,
        ratio: 50,
      },
    };
  }

  // 3. スタイリストの発話比率を計算
  const ratio = (stylistSeconds / totalSeconds) * 100;

  // 4. スコア計算
  const score = calculateTalkRatioScore(ratio);

  return {
    score,
    value: Math.round(ratio * 100) / 100,
    details: {
      stylistSeconds: Math.round(stylistSeconds * 100) / 100,
      customerSeconds: Math.round(customerSeconds * 100) / 100,
      totalSeconds: Math.round(totalSeconds * 100) / 100,
      ratio: Math.round(ratio * 100) / 100,
    },
  };
}

/**
 * トーク比率からスコアを計算
 */
function calculateTalkRatioScore(ratio: number): number {
  // 理想範囲（35-45%）
  if (ratio >= 35 && ratio <= 45) {
    return 100;
  }
  
  // 許容範囲（30-35% or 45-50%）
  if ((ratio >= 30 && ratio < 35) || (ratio > 45 && ratio <= 50)) {
    return 80;
  }
  
  // やや乖離（25-30% or 50-55%）
  if ((ratio >= 25 && ratio < 30) || (ratio > 50 && ratio <= 55)) {
    return 60;
  }
  
  // 大きく乖離
  return 40;
}

/**
 * フォールバック: 話者分離なしの場合
 * 文字起こしの文字数比率で推定
 */
export function estimateTalkRatioFromText(
  transcripts: Array<{ text: string; speaker?: string }>
): TalkRatioResult {
  // 話者情報がない場合は50:50と仮定
  return {
    score: 50,
    value: 50,
    details: {
      stylistSeconds: 0,
      customerSeconds: 0,
      totalSeconds: 0,
      ratio: 50,
    },
  };
}
```

**フローチャート**:

```
┌─────────────────────────────────────────────────────────────────┐
│                   トーク比率計算フロー                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    開始                                                         │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────────────┐                                            │
│  │ セグメント取得   │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐     No      ┌─────────────────┐           │
│  │ セグメント数 > 0 │────────────▶│ デフォルト値返却 │           │
│  └────────┬────────┘             │ (score=50)      │           │
│           │ Yes                   └─────────────────┘           │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ 話者別時間集計   │                                            │
│  │ for each segment│                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ 比率計算         │                                            │
│  │ ratio = stylist │                                            │
│  │ / total * 100   │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────────────────────────────────┐               │
│  │              スコア判定                      │               │
│  │                                             │               │
│  │  35-45% ───────────────────▶ score = 100   │               │
│  │  30-35% or 45-50% ─────────▶ score = 80    │               │
│  │  25-30% or 50-55% ─────────▶ score = 60    │               │
│  │  それ以外 ─────────────────▶ score = 40    │               │
│  │                                             │               │
│  └────────┬────────────────────────────────────┘               │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ 結果返却         │                                            │
│  └─────────────────┘                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

#### 6.1.2 質問分析（Question Analysis）

**目的**: スタイリストの質問数と質問の種類（オープン/クローズド）を分析

**入力**:
- `conversationData: ConversationTurn[]` - 話者付き会話データ

**出力**:
- `score: number` - 0-100のスコア
- `value: number` - 質問総数
- `details: QuestionAnalysisDetails` - 詳細データ

**アルゴリズム**:

```typescript
// src/domain/services/analysis/questionAnalyzer.ts

interface QuestionAnalysisResult {
  score: number;
  value: number;
  details: {
    totalQuestions: number;
    openQuestions: number;
    closedQuestions: number;
    openRatio: number;
    questionList: Array<{
      text: string;
      type: 'open' | 'closed';
      time: number;
    }>;
  };
}

/**
 * 質問検出パターン
 */
const QUESTION_PATTERNS = [
  /[？?]$/,                    // 文末に疑問符
  /でしょうか[。]?$/,          // 〜でしょうか
  /ですか[。]?$/,              // 〜ですか
  /ますか[。]?$/,              // 〜ますか
  /ませんか[。]?$/,            // 〜ませんか
  /かな[。]?$/,                // 〜かな
  /かしら[。]?$/,              // 〜かしら
  /の[。]?$/,                  // 〜の？（上昇イントネーション想定）
];

/**
 * オープンクエスチョンパターン
 * What, Why, How系の質問
 */
const OPEN_QUESTION_PATTERNS = [
  /^(どう|どのよう|どんな)/,    // どう〜、どのような〜
  /^何(が|を|に)/,              // 何が〜
  /^なぜ/,                      // なぜ〜
  /^どこ/,                      // どこ〜
  /^いつ/,                      // いつ〜
  /について/,                   // 〜について
  /どう思/,                     // どう思いますか
  /感じ/,                       // どう感じますか
  /ご希望/,                     // ご希望は
  /お悩み/,                     // お悩みは
  /理由/,                       // 理由は
];

/**
 * 質問分析
 * 
 * スコア計算ロジック:
 * - 理想: 質問8-12回、オープンクエスチョン60%以上
 * - 8-12回 & オープン60%以上: 100点
 * - 6-14回 & オープン50%以上: 80点
 * - 4-16回 & オープン40%以上: 60点
 * - それ以外: 40点
 */
export function analyzeQuestions(
  conversationData: ConversationTurn[]
): QuestionAnalysisResult {
  const stylistUtterances = conversationData.filter(
    turn => turn.speaker === 'stylist'
  );

  const questionList: QuestionAnalysisResult['details']['questionList'] = [];
  let totalQuestions = 0;
  let openQuestions = 0;

  for (const utterance of stylistUtterances) {
    // 質問かどうか判定
    const isQuestion = QUESTION_PATTERNS.some(pattern => 
      pattern.test(utterance.text)
    );

    if (isQuestion) {
      totalQuestions++;
      
      // オープンクエスチョンかどうか判定
      const isOpen = OPEN_QUESTION_PATTERNS.some(pattern =>
        pattern.test(utterance.text)
      );

      if (isOpen) {
        openQuestions++;
      }

      questionList.push({
        text: utterance.text,
        type: isOpen ? 'open' : 'closed',
        time: utterance.startTime,
      });
    }
  }

  const closedQuestions = totalQuestions - openQuestions;
  const openRatio = totalQuestions > 0 
    ? (openQuestions / totalQuestions) * 100 
    : 0;

  const score = calculateQuestionScore(totalQuestions, openRatio);

  return {
    score,
    value: totalQuestions,
    details: {
      totalQuestions,
      openQuestions,
      closedQuestions,
      openRatio: Math.round(openRatio * 100) / 100,
      questionList,
    },
  };
}

/**
 * 質問分析スコア計算
 */
function calculateQuestionScore(totalQuestions: number, openRatio: number): number {
  // 理想範囲
  if (totalQuestions >= 8 && totalQuestions <= 12 && openRatio >= 60) {
    return 100;
  }
  
  // 良好範囲
  if (totalQuestions >= 6 && totalQuestions <= 14 && openRatio >= 50) {
    return 80;
  }
  
  // 許容範囲
  if (totalQuestions >= 4 && totalQuestions <= 16 && openRatio >= 40) {
    return 60;
  }
  
  // それ以外
  return 40;
}

interface ConversationTurn {
  speaker: 'stylist' | 'customer' | 'unknown';
  text: string;
  startTime: number;
  endTime: number;
}
```

---

#### 6.1.3 感情分析（Emotion Analysis）

**目的**: お客様の発話から感情（ポジティブ/ネガティブ）を分析

**入力**:
- `conversationData: ConversationTurn[]` - 話者付き会話データ

**出力**:
- `score: number` - 0-100のスコア
- `value: number` - ポジティブ比率（%）
- `details: EmotionAnalysisDetails` - 詳細データ

**アルゴリズム**:

```typescript
// src/domain/services/analysis/emotionAnalyzer.ts

interface EmotionAnalysisResult {
  score: number;
  value: number;
  details: {
    positiveRatio: number;
    keywords: string[];
    overall: 'positive' | 'neutral' | 'negative';
    timeline: Array<{
      time: number;
      sentiment: 'positive' | 'neutral' | 'negative';
      score: number;
    }>;
  };
}

/**
 * ポジティブキーワード辞書
 */
const POSITIVE_KEYWORDS = [
  // 喜び・満足
  '嬉しい', 'うれしい', '楽しい', 'たのしい', '素敵', 'すてき',
  '良い', 'いい', '最高', 'さいこう', '完璧', 'かんぺき',
  'ありがとう', '感謝', 'かんしゃ', '助かる', 'たすかる',
  // 期待・興味
  '楽しみ', 'たのしみ', '気になる', 'きになる', '興味', 'きょうみ',
  'やってみたい', '試したい', 'ためしたい',
  // 肯定
  'そうですね', 'いいですね', '確かに', 'たしかに',
  'なるほど', 'わかります', 'おっしゃる通り',
  // 美容関連ポジティブ
  'サラサラ', 'さらさら', 'ツヤツヤ', 'つやつや', 'まとまる',
  '似合う', 'にあう', 'きれい', 'キレイ', '綺麗',
];

/**
 * ネガティブキーワード辞書
 */
const NEGATIVE_KEYWORDS = [
  // 不満・困り
  '困る', 'こまる', '嫌', 'いや', 'イヤ', '辛い', 'つらい',
  'ダメ', 'だめ', '駄目', '無理', 'むり',
  // 悩み関連
  '悩み', 'なやみ', '心配', 'しんぱい', '不安', 'ふあん',
  'ストレス', 'すとれす',
  // 髪の悩み
  'パサパサ', 'ぱさぱさ', 'ボサボサ', 'ぼさぼさ',
  'うねる', 'ひろがる', '広がる', 'まとまらない',
  // 否定
  'でも', 'ただ', 'ちょっと', '少し', 'すこし',
];

/**
 * 感情分析（ローカル処理 + Claude API）
 */
export async function analyzeEmotion(
  conversationData: ConversationTurn[],
  claudeApiKey?: string
): Promise<EmotionAnalysisResult> {
  const customerUtterances = conversationData.filter(
    turn => turn.speaker === 'customer'
  );

  if (customerUtterances.length === 0) {
    return {
      score: 50,
      value: 50,
      details: {
        positiveRatio: 50,
        keywords: [],
        overall: 'neutral',
        timeline: [],
      },
    };
  }

  // ローカル処理：キーワードベース分析
  const localResult = analyzeEmotionLocal(customerUtterances);

  // Claude APIが利用可能な場合は高度な分析
  if (claudeApiKey) {
    try {
      const aiResult = await analyzeEmotionWithClaude(
        customerUtterances,
        claudeApiKey
      );
      // AI結果とローカル結果をマージ
      return mergeEmotionResults(localResult, aiResult);
    } catch (error) {
      console.error('Claude API emotion analysis failed:', error);
      // フォールバックでローカル結果を使用
    }
  }

  return localResult;
}

/**
 * ローカル感情分析（キーワードベース）
 */
function analyzeEmotionLocal(
  utterances: ConversationTurn[]
): EmotionAnalysisResult {
  const timeline: EmotionAnalysisResult['details']['timeline'] = [];
  const detectedKeywords: string[] = [];
  let positiveCount = 0;
  let negativeCount = 0;

  for (const utterance of utterances) {
    const text = utterance.text;
    let utterancePositive = 0;
    let utteranceNegative = 0;

    // ポジティブキーワード検出
    for (const keyword of POSITIVE_KEYWORDS) {
      if (text.includes(keyword)) {
        utterancePositive++;
        if (!detectedKeywords.includes(keyword)) {
          detectedKeywords.push(keyword);
        }
      }
    }

    // ネガティブキーワード検出
    for (const keyword of NEGATIVE_KEYWORDS) {
      if (text.includes(keyword)) {
        utteranceNegative++;
        if (!detectedKeywords.includes(keyword)) {
          detectedKeywords.push(keyword);
        }
      }
    }

    positiveCount += utterancePositive;
    negativeCount += utteranceNegative;

    // 発話単位の感情判定
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let sentimentScore = 50;

    if (utterancePositive > utteranceNegative) {
      sentiment = 'positive';
      sentimentScore = 70 + Math.min(utterancePositive * 5, 30);
    } else if (utteranceNegative > utterancePositive) {
      sentiment = 'negative';
      sentimentScore = 30 - Math.min(utteranceNegative * 5, 30);
    }

    timeline.push({
      time: utterance.startTime,
      sentiment,
      score: sentimentScore,
    });
  }

  // 全体の感情比率計算
  const totalKeywords = positiveCount + negativeCount;
  const positiveRatio = totalKeywords > 0
    ? (positiveCount / totalKeywords) * 100
    : 50;

  // 全体判定
  let overall: 'positive' | 'neutral' | 'negative' = 'neutral';
  if (positiveRatio >= 60) overall = 'positive';
  else if (positiveRatio <= 40) overall = 'negative';

  // スコア計算
  const score = calculateEmotionScore(positiveRatio);

  return {
    score,
    value: Math.round(positiveRatio * 100) / 100,
    details: {
      positiveRatio: Math.round(positiveRatio * 100) / 100,
      keywords: detectedKeywords,
      overall,
      timeline,
    },
  };
}

/**
 * Claude APIを使用した感情分析
 */
async function analyzeEmotionWithClaude(
  utterances: ConversationTurn[],
  apiKey: string
): Promise<EmotionAnalysisResult> {
  const customerText = utterances.map(u => u.text).join('\n');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `以下の美容室でのお客様の発話を感情分析してください。

発話内容:
${customerText}

JSON形式で回答してください（説明不要）:
{
  "positiveRatio": 0から100の数値（ポジティブな発話の割合）,
  "keywords": ["検出された感情を示すキーワードの配列"],
  "overall": "positive" または "neutral" または "negative"
}`,
      }],
    }),
  });

  const result = await response.json();
  const content = result.content[0].text;
  
  // JSONパース
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid JSON response from Claude');
  }
  
  const analysis = JSON.parse(jsonMatch[0]);
  const score = calculateEmotionScore(analysis.positiveRatio);

  return {
    score,
    value: analysis.positiveRatio,
    details: {
      positiveRatio: analysis.positiveRatio,
      keywords: analysis.keywords,
      overall: analysis.overall,
      timeline: [],
    },
  };
}

/**
 * 感情分析スコア計算
 */
function calculateEmotionScore(positiveRatio: number): number {
  if (positiveRatio >= 70) return 100;
  if (positiveRatio >= 60) return 85;
  if (positiveRatio >= 50) return 70;
  if (positiveRatio >= 40) return 55;
  return 40;
}

/**
 * ローカル結果とAI結果のマージ
 */
function mergeEmotionResults(
  local: EmotionAnalysisResult,
  ai: EmotionAnalysisResult
): EmotionAnalysisResult {
  // AI結果を優先しつつ、ローカルのtimelineを保持
  return {
    score: ai.score,
    value: ai.value,
    details: {
      ...ai.details,
      timeline: local.details.timeline,
      keywords: [...new Set([...local.details.keywords, ...ai.details.keywords])],
    },
  };
}
```

---

#### 6.1.4 悩みキーワード検出（Concern Keywords Detection）

**目的**: お客様の髪の悩みに関するキーワードを検出

**入力**:
- `conversationData: ConversationTurn[]` - 話者付き会話データ
- `concernKeywords: string[]` - 検出対象キーワードリスト（店舗設定）

**出力**:
- `score: number` - 0-100のスコア
- `value: number` - 検出有無（0 or 1）
- `details: ConcernKeywordsDetails` - 詳細データ

**アルゴリズム**:

```typescript
// src/domain/services/analysis/concernDetector.ts

interface ConcernKeywordsResult {
  score: number;
  value: number;
  details: {
    detected: boolean;
    detectedKeywords: string[];
    detectedAt: number[];
    context: string;
    keywordOccurrences: Array<{
      keyword: string;
      time: number;
      context: string;
    }>;
  };
}

/**
 * デフォルト悩みキーワード
 */
const DEFAULT_CONCERN_KEYWORDS = [
  // 乾燥系
  '乾燥', 'かんそう', 'パサパサ', 'ぱさぱさ', 'パサつき', 'ぱさつき',
  '潤いがない', 'うるおいがない', 'カサカサ', 'かさかさ',
  // 広がり系
  '広がる', 'ひろがる', '広がり', 'ひろがり', 'まとまらない',
  'ボワッと', 'ぼわっと', '爆発', 'ばくはつ',
  // ダメージ系
  'ダメージ', 'だめーじ', '傷んでる', 'いたんでる', '傷み', 'いたみ',
  '枝毛', 'えだげ', '切れ毛', 'きれげ', 'チリチリ', 'ちりちり',
  // うねり系
  'うねり', 'ウネリ', 'くせ毛', 'クセ毛', 'くせげ',
  'ハネる', 'はねる', 'ハネ', 'はね',
  // 薄毛系
  '薄毛', 'うすげ', 'ボリュームがない', 'ぺたんこ', 'ペタンコ',
  '抜け毛', 'ぬけげ', '細い', 'ほそい', 'コシがない',
  // 白髪系
  '白髪', 'しらが', 'グレイヘア', 'ぐれいへあ',
  // 頭皮系
  '頭皮', 'とうひ', 'かゆい', 'カユイ', 'フケ', 'ふけ',
  'べたつき', 'ベタつき', '臭い', 'におい',
  // その他
  '色落ち', 'いろおち', '退色', 'たいしょく',
  'パーマがとれる', 'カールが弱い',
];

/**
 * 悩みキーワード検出
 */
export function detectConcernKeywords(
  conversationData: ConversationTurn[],
  customKeywords?: string[]
): ConcernKeywordsResult {
  const keywords = customKeywords && customKeywords.length > 0
    ? customKeywords
    : DEFAULT_CONCERN_KEYWORDS;

  const customerUtterances = conversationData.filter(
    turn => turn.speaker === 'customer'
  );

  const detectedKeywords: string[] = [];
  const detectedAt: number[] = [];
  const keywordOccurrences: ConcernKeywordsResult['details']['keywordOccurrences'] = [];
  let contextText = '';

  for (const utterance of customerUtterances) {
    const text = utterance.text;

    for (const keyword of keywords) {
      if (text.includes(keyword) && !detectedKeywords.includes(keyword)) {
        detectedKeywords.push(keyword);
        detectedAt.push(utterance.startTime);
        
        // コンテキスト抽出（キーワード前後20文字）
        const keywordIndex = text.indexOf(keyword);
        const start = Math.max(0, keywordIndex - 20);
        const end = Math.min(text.length, keywordIndex + keyword.length + 20);
        const context = text.substring(start, end);

        keywordOccurrences.push({
          keyword,
          time: utterance.startTime,
          context: `...${context}...`,
        });

        // 初回検出時のコンテキスト保存
        if (!contextText && utterance.text.length > 0) {
          contextText = utterance.text;
        }
      }
    }
  }

  const detected = detectedKeywords.length > 0;

  return {
    score: detected ? 100 : 50,
    value: detected ? 1 : 0,
    details: {
      detected,
      detectedKeywords,
      detectedAt,
      context: contextText.substring(0, 200),
      keywordOccurrences,
    },
  };
}

/**
 * 悩みキーワードのカテゴリ分類
 */
export function categorizeConcerns(
  keywords: string[]
): Record<string, string[]> {
  const categories: Record<string, string[]> = {
    '乾燥': [],
    '広がり': [],
    'ダメージ': [],
    'うねり': [],
    '薄毛': [],
    '白髪': [],
    '頭皮': [],
    'その他': [],
  };

  const categoryMapping: Record<string, string> = {
    '乾燥': '乾燥',
    'パサパサ': '乾燥',
    'パサつき': '乾燥',
    '広がる': '広がり',
    '広がり': '広がり',
    'まとまらない': '広がり',
    'ダメージ': 'ダメージ',
    '傷んでる': 'ダメージ',
    '枝毛': 'ダメージ',
    'うねり': 'うねり',
    'くせ毛': 'うねり',
    '薄毛': '薄毛',
    'ボリュームがない': '薄毛',
    '白髪': '白髪',
    '頭皮': '頭皮',
  };

  for (const keyword of keywords) {
    const category = categoryMapping[keyword] || 'その他';
    if (!categories[category].includes(keyword)) {
      categories[category].push(keyword);
    }
  }

  return categories;
}
```

---

#### 6.1.5 提案タイミング分析（Proposal Timing）

**目的**: 悩みキーワード検出後から商品提案までの時間を分析

**入力**:
- `conversationData: ConversationTurn[]` - 話者付き会話データ
- `concernResult: ConcernKeywordsResult` - 悩みキーワード検出結果

**出力**:
- `score: number` - 0-100のスコア
- `value: number` - 提案までの時間（分）
- `details: ProposalTimingDetails` - 詳細データ

**アルゴリズム**:

```typescript
// src/domain/services/analysis/proposalTimingAnalyzer.ts

interface ProposalTimingResult {
  score: number;
  value: number;
  details: {
    concernDetectedAt: number | null;
    proposalAt: number | null;
    timingMinutes: number | null;
    timingEvaluation: 'optimal' | 'good' | 'late' | 'too_early' | 'no_proposal';
  };
}

/**
 * 商品提案パターン
 */
const PROPOSAL_PATTERNS = [
  // 商品名言及
  /シャンプー|トリートメント|オイル|ミスト|ワックス|スプレー/,
  /ヘアケア|ホームケア/,
  // 提案フレーズ
  /おすすめ|オススメ/,
  /いいですよ|良いですよ/,
  /使ってみ/,
  /試してみ/,
  /こちら.*(商品|製品)/,
  // 効果説明
  /これ.*(効果|効き目)/,
  /サラサラに.*なり/,
  /まとまり.*良く/,
];

/**
 * 提案タイミング分析
 * 
 * スコア計算ロジック:
 * - 理想: 悩み検出後2-5分で提案
 * - 2-5分: 100点（最適タイミング）
 * - 1-2分 or 5-7分: 80点（良好）
 * - 7-10分: 60点（やや遅い）
 * - 1分未満: 60点（やや早い）
 * - 10分以上 or 提案なし: 40点
 */
export function analyzeProposalTiming(
  conversationData: ConversationTurn[],
  concernResult: ConcernKeywordsResult
): ProposalTimingResult {
  // 悩みが検出されていない場合
  if (!concernResult.details.detected) {
    return {
      score: 50,
      value: 0,
      details: {
        concernDetectedAt: null,
        proposalAt: null,
        timingMinutes: null,
        timingEvaluation: 'no_proposal',
      },
    };
  }

  const concernDetectedAt = concernResult.details.detectedAt[0];

  // スタイリストの発話から提案を検出
  const stylistUtterances = conversationData
    .filter(turn => turn.speaker === 'stylist')
    .filter(turn => turn.startTime > concernDetectedAt);  // 悩み検出後のみ

  let proposalAt: number | null = null;

  for (const utterance of stylistUtterances) {
    const isProposal = PROPOSAL_PATTERNS.some(pattern =>
      pattern.test(utterance.text)
    );

    if (isProposal) {
      proposalAt = utterance.startTime;
      break;  // 最初の提案を採用
    }
  }

  // 提案がなかった場合
  if (proposalAt === null) {
    return {
      score: 40,
      value: 0,
      details: {
        concernDetectedAt,
        proposalAt: null,
        timingMinutes: null,
        timingEvaluation: 'no_proposal',
      },
    };
  }

  // タイミング計算（分）
  const timingMinutes = (proposalAt - concernDetectedAt) / 60;
  const { score, evaluation } = evaluateProposalTiming(timingMinutes);

  return {
    score,
    value: Math.round(timingMinutes * 100) / 100,
    details: {
      concernDetectedAt,
      proposalAt,
      timingMinutes: Math.round(timingMinutes * 100) / 100,
      timingEvaluation: evaluation,
    },
  };
}

/**
 * 提案タイミング評価
 */
function evaluateProposalTiming(
  minutes: number
): { score: number; evaluation: ProposalTimingResult['details']['timingEvaluation'] } {
  if (minutes >= 2 && minutes <= 5) {
    return { score: 100, evaluation: 'optimal' };
  }
  
  if ((minutes >= 1 && minutes < 2) || (minutes > 5 && minutes <= 7)) {
    return { score: 80, evaluation: 'good' };
  }
  
  if (minutes < 1) {
    return { score: 60, evaluation: 'too_early' };
  }
  
  if (minutes > 7 && minutes <= 10) {
    return { score: 60, evaluation: 'late' };
  }
  
  // 10分以上
  return { score: 40, evaluation: 'late' };
}
```

---

#### 6.1.6 提案品質分析（Proposal Quality）

**目的**: 商品提案時にベネフィット（効果・メリット）を伝えているか分析

**入力**:
- `conversationData: ConversationTurn[]` - 話者付き会話データ

**出力**:
- `score: number` - 0-100のスコア
- `value: number` - ベネフィット比率（%）
- `details: ProposalQualityDetails` - 詳細データ

**アルゴリズム**:

```typescript
// src/domain/services/analysis/proposalQualityAnalyzer.ts

interface ProposalQualityResult {
  score: number;
  value: number;
  details: {
    hasProposal: boolean;
    benefitRatio: number;
    proposalDetails: Array<{
      text: string;
      type: 'benefit' | 'spec' | 'mixed';
      time: number;
    }>;
    benefitExamples: string[];
    specExamples: string[];
  };
}

/**
 * ベネフィット（効果・メリット）パターン
 */
const BENEFIT_PATTERNS = [
  // 効果・結果
  /サラサラ|さらさら/,
  /ツヤツヤ|つやつや|ツヤ|艶/,
  /まとまり|まとまる/,
  /しっとり/,
  /やわらか|柔らか/,
  /ハリ|コシ/,
  // 改善・解決
  /改善|かいぜん/,
  /解消|かいしょう/,
  /抑え|おさえ/,
  /防ぐ|ふせぐ/,
  // お客様目線
  /楽に|らくに/,
  /簡単に|かんたんに/,
  /時短/,
  /朝.*(楽|簡単)/,
  // 感情的ベネフィット
  /自信/,
  /喜/,
  /褒め/,
];

/**
 * スペック（成分・機能）パターン
 */
const SPEC_PATTERNS = [
  // 成分
  /成分/,
  /配合/,
  /オイル|エキス/,
  /ヒアルロン|コラーゲン|ケラチン/,
  /アミノ酸/,
  // 機能・仕様
  /ml|ミリリットル/,
  /プロ仕様/,
  /サロン専売/,
  /持続|もつ/,
  // 価格
  /円|¥/,
  /コスパ/,
];

/**
 * 提案品質分析
 * 
 * スコア計算ロジック:
 * - ベネフィット比率70%以上: 100点
 * - ベネフィット比率50-70%: 80点
 * - ベネフィット比率30-50%: 60点
 * - ベネフィット比率30%未満 or 提案なし: 40点
 */
export async function analyzeProposalQuality(
  conversationData: ConversationTurn[],
  claudeApiKey?: string
): Promise<ProposalQualityResult> {
  const stylistUtterances = conversationData.filter(
    turn => turn.speaker === 'stylist'
  );

  // 提案を含む発話を検出
  const proposalUtterances = stylistUtterances.filter(utterance => {
    return PROPOSAL_PATTERNS.some(pattern => pattern.test(utterance.text)) ||
           BENEFIT_PATTERNS.some(pattern => pattern.test(utterance.text)) ||
           SPEC_PATTERNS.some(pattern => pattern.test(utterance.text));
  });

  if (proposalUtterances.length === 0) {
    return {
      score: 40,
      value: 0,
      details: {
        hasProposal: false,
        benefitRatio: 0,
        proposalDetails: [],
        benefitExamples: [],
        specExamples: [],
      },
    };
  }

  // ローカル分析
  const proposalDetails: ProposalQualityResult['details']['proposalDetails'] = [];
  const benefitExamples: string[] = [];
  const specExamples: string[] = [];
  let benefitCount = 0;
  let specCount = 0;

  for (const utterance of proposalUtterances) {
    const hasBenefit = BENEFIT_PATTERNS.some(p => p.test(utterance.text));
    const hasSpec = SPEC_PATTERNS.some(p => p.test(utterance.text));

    let type: 'benefit' | 'spec' | 'mixed' = 'spec';
    if (hasBenefit && hasSpec) {
      type = 'mixed';
      benefitCount += 0.5;
      specCount += 0.5;
    } else if (hasBenefit) {
      type = 'benefit';
      benefitCount++;
      if (benefitExamples.length < 3) {
        benefitExamples.push(utterance.text.substring(0, 50));
      }
    } else {
      specCount++;
      if (specExamples.length < 3) {
        specExamples.push(utterance.text.substring(0, 50));
      }
    }

    proposalDetails.push({
      text: utterance.text,
      type,
      time: utterance.startTime,
    });
  }

  const total = benefitCount + specCount;
  const benefitRatio = total > 0 ? (benefitCount / total) * 100 : 0;
  const score = calculateProposalQualityScore(benefitRatio);

  return {
    score,
    value: Math.round(benefitRatio * 100) / 100,
    details: {
      hasProposal: true,
      benefitRatio: Math.round(benefitRatio * 100) / 100,
      proposalDetails,
      benefitExamples,
      specExamples,
    },
  };
}

/**
 * 提案品質スコア計算
 */
function calculateProposalQualityScore(benefitRatio: number): number {
  if (benefitRatio >= 70) return 100;
  if (benefitRatio >= 50) return 80;
  if (benefitRatio >= 30) return 60;
  return 40;
}

// 商品提案検出用パターン（再利用）
const PROPOSAL_PATTERNS = [
  /シャンプー|トリートメント|オイル|ミスト/,
  /おすすめ|オススメ/,
  /使ってみ/,
];
```

---

#### 6.1.7 成約判定（Conversion Detection）

**目的**: 商品購入の成約があったかを検出

**入力**:
- `conversationData: ConversationTurn[]` - 話者付き会話データ

**出力**:
- `score: number` - 0-100のスコア
- `value: number` - 成約有無（0 or 1）
- `details: ConversionDetails` - 詳細データ

**アルゴリズム**:

```typescript
// src/domain/services/analysis/conversionDetector.ts

interface ConversionResult {
  score: number;
  value: number;
  details: {
    converted: boolean;
    productName: string | null;
    conversionSignals: string[];
    detectedAt: number | null;
  };
}

/**
 * 成約シグナルパターン
 */
const CONVERSION_SIGNALS = {
  // 購入意思表明（お客様）
  customerBuy: [
    /買い(ます|たい)/,
    /購入(し|したい)/,
    /もらい(ます|たい)/,
    /お願い(し|します)/,
    /それ.*(ください|下さい)/,
    /これ.*(ください|下さい)/,
    /いただ(け|き)/,
  ],
  // 決定表現（お客様）
  customerDecision: [
    /じゃあ.*それ/,
    /それに(します|しよう)/,
    /決め(まし|た)/,
  ],
  // 購入確認（スタイリスト）
  stylistConfirm: [
    /ありがとうございます.*お買い上げ/,
    /では.*こちら/,
    /お会計/,
    /レジ/,
    /包み/,
  ],
};

/**
 * 商品名検出パターン
 */
const PRODUCT_NAME_PATTERNS = [
  // 一般的な商品カテゴリ
  /([\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+)(シャンプー|トリートメント|オイル|ミスト|ワックス|スプレー)/,
  // 商品名＋「を」「が」
  /「([^」]+)」(を|が|は)/,
];

/**
 * 成約判定
 */
export function detectConversion(
  conversationData: ConversationTurn[]
): ConversionResult {
  const conversionSignals: string[] = [];
  let converted = false;
  let productName: string | null = null;
  let detectedAt: number | null = null;

  // お客様の発話から購入意思を検出
  const customerUtterances = conversationData.filter(
    turn => turn.speaker === 'customer'
  );

  for (const utterance of customerUtterances) {
    // 購入意思パターン
    for (const pattern of CONVERSION_SIGNALS.customerBuy) {
      if (pattern.test(utterance.text)) {
        converted = true;
        detectedAt = detectedAt || utterance.startTime;
        conversionSignals.push(`購入意思: "${utterance.text.substring(0, 30)}..."`);
        break;
      }
    }

    // 決定パターン
    for (const pattern of CONVERSION_SIGNALS.customerDecision) {
      if (pattern.test(utterance.text)) {
        converted = true;
        detectedAt = detectedAt || utterance.startTime;
        conversionSignals.push(`購入決定: "${utterance.text.substring(0, 30)}..."`);
        break;
      }
    }
  }

  // スタイリストの発話から購入確認を検出
  const stylistUtterances = conversationData.filter(
    turn => turn.speaker === 'stylist'
  );

  for (const utterance of stylistUtterances) {
    for (const pattern of CONVERSION_SIGNALS.stylistConfirm) {
      if (pattern.test(utterance.text)) {
        converted = true;
        detectedAt = detectedAt || utterance.startTime;
        conversionSignals.push(`購入確認: "${utterance.text.substring(0, 30)}..."`);
        break;
      }
    }
  }

  // 商品名の抽出
  if (converted) {
    const allText = conversationData.map(t => t.text).join(' ');
    for (const pattern of PRODUCT_NAME_PATTERNS) {
      const match = allText.match(pattern);
      if (match) {
        productName = match[1] || match[0];
        break;
      }
    }
  }

  return {
    score: converted ? 100 : 50,
    value: converted ? 1 : 0,
    details: {
      converted,
      productName,
      conversionSignals,
      detectedAt,
    },
  };
}

/**
 * Claude APIを使用した高度な成約判定
 */
export async function detectConversionWithClaude(
  conversationData: ConversationTurn[],
  apiKey: string
): Promise<ConversionResult> {
  const conversationText = conversationData
    .map(t => `[${t.speaker === 'stylist' ? 'スタイリスト' : 'お客様'}] ${t.text}`)
    .join('\n');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `以下の美容室での会話から、商品の購入（成約）があったかを判定してください。

会話:
${conversationText}

JSON形式で回答（説明不要）:
{
  "converted": true または false,
  "productName": "購入された商品名" または null,
  "confidence": 0から100の確信度
}`,
      }],
    }),
  });

  const result = await response.json();
  const content = result.content[0].text;
  
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid JSON response');
  }
  
  const analysis = JSON.parse(jsonMatch[0]);

  return {
    score: analysis.converted ? 100 : 50,
    value: analysis.converted ? 1 : 0,
    details: {
      converted: analysis.converted,
      productName: analysis.productName,
      conversionSignals: [],
      detectedAt: null,
    },
  };
}
```

---

### 6.2 総合スコア計算アルゴリズム

```typescript
// src/domain/services/analysis/overallScoreCalculator.ts

interface IndicatorWeight {
  type: IndicatorType;
  weight: number;
}

/**
 * 指標の重み付け設定
 */
const INDICATOR_WEIGHTS: IndicatorWeight[] = [
  { type: 'talk_ratio', weight: 0.15 },
  { type: 'question_analysis', weight: 0.15 },
  { type: 'emotion_analysis', weight: 0.15 },
  { type: 'concern_keywords', weight: 0.10 },
  { type: 'proposal_timing', weight: 0.15 },
  { type: 'proposal_quality', weight: 0.15 },
  { type: 'conversion', weight: 0.15 },
];

/**
 * 総合スコア計算
 * 
 * 計算式: Σ(指標スコア × 重み) / Σ(有効な重み)
 */
export function calculateOverallScore(
  analysisResults: Map<IndicatorType, { score: number; value: number }>
): number {
  let totalScore = 0;
  let totalWeight = 0;

  for (const { type, weight } of INDICATOR_WEIGHTS) {
    const result = analysisResults.get(type);
    if (result) {
      totalScore += result.score * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) {
    return 0;
  }

  // 重みの合計で正規化
  const normalizedScore = (totalScore / totalWeight) * (1 / totalWeight) * totalWeight;
  
  return Math.round(normalizedScore * 100) / 100;
}

/**
 * スコアランク判定
 */
export function getScoreRank(score: number): ScoreRank {
  if (score >= 90) return { rank: 'S', label: '素晴らしい', color: '#FFD700' };
  if (score >= 80) return { rank: 'A', label: '良い', color: '#10B981' };
  if (score >= 70) return { rank: 'B', label: '普通', color: '#6366F1' };
  if (score >= 60) return { rank: 'C', label: '要改善', color: '#F59E0B' };
  return { rank: 'D', label: '要注意', color: '#EF4444' };
}

interface ScoreRank {
  rank: 'S' | 'A' | 'B' | 'C' | 'D';
  label: string;
  color: string;
}

type IndicatorType =
  | 'talk_ratio'
  | 'question_analysis'
  | 'emotion_analysis'
  | 'concern_keywords'
  | 'proposal_timing'
  | 'proposal_quality'
  | 'conversion';
```

---

### 6.3 ベクトル検索アルゴリズム

```typescript
// src/domain/services/search/vectorSearchService.ts

/**
 * 成功事例検索のためのベクトル検索サービス
 */
export class VectorSearchService {
  private readonly supabase: SupabaseClient;
  private readonly openaiApiKey: string;
  
  constructor(supabase: SupabaseClient, openaiApiKey: string) {
    this.supabase = supabase;
    this.openaiApiKey = openaiApiKey;
  }

  /**
   * 成功事例を検索
   */
  async searchSuccessCases(params: {
    concernKeywords: string[];
    customerInfo?: CustomerInfo;
    salonId: string;
    limit?: number;
    threshold?: number;
  }): Promise<SearchResult[]> {
    const { concernKeywords, customerInfo, salonId, limit = 5, threshold = 0.7 } = params;

    // 1. 検索クエリテキストを生成
    const queryText = this.buildQueryText(concernKeywords, customerInfo);

    // 2. Embeddingを生成
    const embedding = await this.createEmbedding(queryText);

    // 3. ベクトル検索（pgvector）
    const { data, error } = await this.supabase.rpc('search_success_cases', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit,
      salon_id: salonId,
    });

    if (error) {
      console.error('Vector search error:', error);
      // フォールバック: キーワード検索
      return this.fallbackKeywordSearch(concernKeywords, salonId, limit);
    }

    return data.map((item: any) => ({
      id: item.id,
      concernKeywords: item.concern_keywords,
      successfulTalk: item.successful_talk,
      keyTactics: item.key_tactics,
      soldProduct: item.sold_product,
      similarity: item.similarity,
    }));
  }

  /**
   * 検索クエリテキストを生成
   */
  private buildQueryText(
    concernKeywords: string[],
    customerInfo?: CustomerInfo
  ): string {
    const parts: string[] = [];

    // 悩みキーワード
    if (concernKeywords.length > 0) {
      parts.push(`悩み: ${concernKeywords.join(', ')}`);
    }

    // お客様属性
    if (customerInfo) {
      if (customerInfo.ageGroup) {
        parts.push(`年代: ${customerInfo.ageGroup}`);
      }
      if (customerInfo.gender) {
        parts.push(`性別: ${customerInfo.gender}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * OpenAI Embedding生成
   */
  private async createEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const result = await response.json();
    return result.data[0].embedding;
  }

  /**
   * フォールバック: キーワードベース検索
   */
  private async fallbackKeywordSearch(
    keywords: string[],
    salonId: string,
    limit: number
  ): Promise<SearchResult[]> {
    const { data, error } = await this.supabase
      .from('success_cases')
      .select('*')
      .or(`salon_id.eq.${salonId},is_public.eq.true`)
      .overlaps('concern_keywords', keywords)
      .limit(limit);

    if (error) {
      console.error('Keyword search error:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      concernKeywords: item.concern_keywords,
      successfulTalk: item.successful_talk,
      keyTactics: item.key_tactics,
      soldProduct: item.sold_product,
      similarity: null,  // キーワード検索では類似度なし
    }));
  }
}

interface SearchResult {
  id: string;
  concernKeywords: string[];
  successfulTalk: string;
  keyTactics: string[];
  soldProduct: string | null;
  similarity: number | null;
}

interface CustomerInfo {
  ageGroup?: string;
  gender?: string;
}
```

---

（続きは Part 5 に記載: データベース物理設計、画面項目詳細定義）
# 詳細設計書 Part 5: データベース物理設計・画面項目詳細定義

---

## 7. データベース物理設計

### 7.1 物理スキーマ定義

#### 7.1.1 完全なDDL（Data Definition Language）

```sql
-- ============================================================
-- SalonTalk AI データベース物理設計
-- PostgreSQL 15+ / Supabase
-- ============================================================

-- ============================================================
-- 拡張機能の有効化
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- カスタム型定義
-- ============================================================

-- プラン種別
CREATE TYPE plan_type AS ENUM ('standard', 'professional', 'enterprise');

-- スタッフロール
CREATE TYPE staff_role AS ENUM ('owner', 'manager', 'stylist', 'assistant');

-- セッションステータス
CREATE TYPE session_status AS ENUM ('recording', 'processing', 'completed', 'failed');

-- 話者分離ステータス
CREATE TYPE diarization_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- 話者
CREATE TYPE speaker_type AS ENUM ('stylist', 'customer', 'unknown');

-- 分析指標タイプ
CREATE TYPE indicator_type AS ENUM (
  'talk_ratio',
  'question_analysis',
  'emotion_analysis',
  'concern_keywords',
  'proposal_timing',
  'proposal_quality',
  'conversion'
);

-- ============================================================
-- テーブル定義
-- ============================================================

-- ------------------------------------------------------------
-- salons（店舗）
-- ------------------------------------------------------------
CREATE TABLE salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  plan plan_type NOT NULL DEFAULT 'standard',
  seats_count INTEGER CHECK (seats_count IS NULL OR seats_count > 0),
  settings JSONB NOT NULL DEFAULT '{
    "notification": {
      "enablePush": true,
      "enableEmail": true,
      "concernDetectionAlert": true,
      "sessionCompleteAlert": true
    },
    "analysis": {
      "idealTalkRatio": 40,
      "minQuestionCount": 8,
      "concernKeywords": ["乾燥", "広がり", "パサつき", "ダメージ", "うねり", "薄毛", "白髪"]
    },
    "display": {
      "showRanking": true,
      "anonymizeCustomer": false
    }
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_salons_plan ON salons(plan);
CREATE INDEX idx_salons_created_at ON salons(created_at);

-- 更新日時自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_salons_updated_at
  BEFORE UPDATE ON salons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- staffs（スタッフ）
-- ------------------------------------------------------------
CREATE TABLE staffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role staff_role NOT NULL DEFAULT 'stylist',
  position VARCHAR(50),
  join_date DATE,
  profile_image_url TEXT,
  settings JSONB NOT NULL DEFAULT '{
    "notificationPreferences": {
      "concernAlert": true,
      "sessionComplete": true,
      "weeklyReport": true
    },
    "displayPreferences": {
      "showScore": true,
      "showRanking": true
    }
  }'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT staffs_salon_email_unique UNIQUE (salon_id, email),
  CONSTRAINT staffs_auth_user_unique UNIQUE (auth_user_id)
);

-- インデックス
CREATE INDEX idx_staffs_salon_id ON staffs(salon_id);
CREATE INDEX idx_staffs_auth_user_id ON staffs(auth_user_id);
CREATE INDEX idx_staffs_role ON staffs(role);
CREATE INDEX idx_staffs_is_active ON staffs(is_active);
CREATE INDEX idx_staffs_salon_active ON staffs(salon_id, is_active) WHERE is_active = true;

CREATE TRIGGER update_staffs_updated_at
  BEFORE UPDATE ON staffs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- sessions（セッション）
-- ------------------------------------------------------------
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  stylist_id UUID NOT NULL REFERENCES staffs(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status session_status NOT NULL DEFAULT 'recording',
  customer_info JSONB,
  diarization_status diarization_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT sessions_end_after_start CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- インデックス
CREATE INDEX idx_sessions_salon_id ON sessions(salon_id);
CREATE INDEX idx_sessions_stylist_id ON sessions(stylist_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX idx_sessions_salon_started ON sessions(salon_id, started_at DESC);
CREATE INDEX idx_sessions_stylist_started ON sessions(stylist_id, started_at DESC);
CREATE INDEX idx_sessions_active ON sessions(stylist_id, status) WHERE status = 'recording';

-- 月別パーティション用（将来拡張）
-- CREATE INDEX idx_sessions_started_month ON sessions(date_trunc('month', started_at));

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- transcripts（文字起こし）
-- ------------------------------------------------------------
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  start_time NUMERIC(10, 3) NOT NULL,
  end_time NUMERIC(10, 3) NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT transcripts_session_chunk_unique UNIQUE (session_id, chunk_index),
  CONSTRAINT transcripts_time_valid CHECK (end_time > start_time)
);

-- インデックス
CREATE INDEX idx_transcripts_session_id ON transcripts(session_id);
CREATE INDEX idx_transcripts_session_chunk ON transcripts(session_id, chunk_index);

-- ------------------------------------------------------------
-- speaker_segments（話者セグメント）
-- ------------------------------------------------------------
CREATE TABLE speaker_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  speaker speaker_type NOT NULL,
  start_time NUMERIC(10, 3) NOT NULL,
  end_time NUMERIC(10, 3) NOT NULL,
  text TEXT,
  confidence NUMERIC(5, 4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT speaker_segments_time_valid CHECK (end_time > start_time)
);

-- インデックス
CREATE INDEX idx_speaker_segments_session_id ON speaker_segments(session_id);
CREATE INDEX idx_speaker_segments_speaker ON speaker_segments(speaker);
CREATE INDEX idx_speaker_segments_session_time ON speaker_segments(session_id, start_time);

-- ------------------------------------------------------------
-- session_analyses（セッション分析）
-- ------------------------------------------------------------
CREATE TABLE session_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  indicator_type indicator_type NOT NULL,
  value NUMERIC(10, 4) NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT session_analyses_unique UNIQUE (session_id, chunk_index, indicator_type)
);

-- インデックス
CREATE INDEX idx_session_analyses_session_id ON session_analyses(session_id);
CREATE INDEX idx_session_analyses_indicator ON session_analyses(indicator_type);
CREATE INDEX idx_session_analyses_session_chunk ON session_analyses(session_id, chunk_index);
CREATE INDEX idx_session_analyses_session_indicator ON session_analyses(session_id, indicator_type);

-- ------------------------------------------------------------
-- session_reports（セッションレポート）
-- ------------------------------------------------------------
CREATE TABLE session_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  good_points TEXT[] NOT NULL DEFAULT '{}',
  improvement_points TEXT[] NOT NULL DEFAULT '{}',
  action_items TEXT[] NOT NULL DEFAULT '{}',
  transcript_summary TEXT,
  ai_feedback TEXT,
  indicator_scores JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT session_reports_session_unique UNIQUE (session_id)
);

-- インデックス
CREATE INDEX idx_session_reports_session_id ON session_reports(session_id);
CREATE INDEX idx_session_reports_score ON session_reports(overall_score DESC);
CREATE INDEX idx_session_reports_created_at ON session_reports(created_at DESC);

-- ------------------------------------------------------------
-- success_cases（成功事例）
-- ------------------------------------------------------------
CREATE TABLE success_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  stylist_id UUID REFERENCES staffs(id) ON DELETE SET NULL,
  concern_keywords TEXT[] NOT NULL DEFAULT '{}',
  customer_profile JSONB,
  successful_talk TEXT NOT NULL,
  key_tactics TEXT[] NOT NULL DEFAULT '{}',
  sold_product VARCHAR(100),
  conversion_rate NUMERIC(5, 4) CHECK (conversion_rate IS NULL OR (conversion_rate >= 0 AND conversion_rate <= 1)),
  embedding VECTOR(1536),
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_success_cases_salon_id ON success_cases(salon_id);
CREATE INDEX idx_success_cases_is_public ON success_cases(is_public);
CREATE INDEX idx_success_cases_concern ON success_cases USING GIN(concern_keywords);
CREATE INDEX idx_success_cases_created_at ON success_cases(created_at DESC);

-- HNSWベクトルインデックス（高速近似最近傍探索）
CREATE INDEX idx_success_cases_embedding ON success_cases 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ------------------------------------------------------------
-- training_scenarios（トレーニングシナリオ）
-- ------------------------------------------------------------
CREATE TABLE training_scenarios (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  level VARCHAR(20) NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  description TEXT,
  category VARCHAR(50) NOT NULL,
  initial_prompt TEXT NOT NULL,
  evaluation_criteria JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_training_scenarios_level ON training_scenarios(level);
CREATE INDEX idx_training_scenarios_category ON training_scenarios(category);
CREATE INDEX idx_training_scenarios_active ON training_scenarios(is_active);

-- ------------------------------------------------------------
-- roleplay_sessions（ロールプレイセッション）
-- ------------------------------------------------------------
CREATE TABLE roleplay_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staffs(id) ON DELETE CASCADE,
  scenario_id VARCHAR(50) NOT NULL REFERENCES training_scenarios(id),
  conversation_history JSONB NOT NULL DEFAULT '[]',
  evaluation JSONB,
  overall_score INTEGER CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)),
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_roleplay_sessions_staff_id ON roleplay_sessions(staff_id);
CREATE INDEX idx_roleplay_sessions_scenario_id ON roleplay_sessions(scenario_id);
CREATE INDEX idx_roleplay_sessions_status ON roleplay_sessions(status);

-- ------------------------------------------------------------
-- audit_logs（監査ログ）
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES staffs(id),
  salon_id UUID REFERENCES salons(id),
  resource_type VARCHAR(50),
  resource_id UUID,
  action VARCHAR(20),
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  request_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_salon ON audit_logs(salon_id, created_at DESC);
CREATE INDEX idx_audit_logs_event ON audit_logs(event_type, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 自動削除（90日経過後）
CREATE OR REPLACE FUNCTION delete_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS（Row Level Security）ポリシー
-- ============================================================

-- RLS有効化
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE speaker_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE roleplay_sessions ENABLE ROW LEVEL SECURITY;

-- ユーティリティ関数
CREATE OR REPLACE FUNCTION get_current_user_salon_id()
RETURNS UUID AS $$
  SELECT salon_id FROM staffs WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS staff_role AS $$
  SELECT role FROM staffs WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_current_user_staff_id()
RETURNS UUID AS $$
  SELECT id FROM staffs WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- salons ポリシー
CREATE POLICY "salon_select" ON salons
  FOR SELECT USING (id = get_current_user_salon_id());

CREATE POLICY "salon_update" ON salons
  FOR UPDATE USING (
    id = get_current_user_salon_id() 
    AND get_current_user_role() = 'owner'
  );

-- staffs ポリシー
CREATE POLICY "staff_select" ON staffs
  FOR SELECT USING (salon_id = get_current_user_salon_id());

CREATE POLICY "staff_insert" ON staffs
  FOR INSERT WITH CHECK (
    salon_id = get_current_user_salon_id()
    AND get_current_user_role() IN ('owner', 'manager')
  );

CREATE POLICY "staff_update" ON staffs
  FOR UPDATE USING (
    salon_id = get_current_user_salon_id()
    AND get_current_user_role() IN ('owner', 'manager')
  );

CREATE POLICY "staff_delete" ON staffs
  FOR DELETE USING (
    salon_id = get_current_user_salon_id()
    AND get_current_user_role() = 'owner'
  );

-- sessions ポリシー
CREATE POLICY "session_select_own" ON sessions
  FOR SELECT USING (
    salon_id = get_current_user_salon_id()
    AND (
      stylist_id = get_current_user_staff_id()
      OR get_current_user_role() IN ('owner', 'manager')
    )
  );

CREATE POLICY "session_insert" ON sessions
  FOR INSERT WITH CHECK (
    salon_id = get_current_user_salon_id()
    AND stylist_id = get_current_user_staff_id()
    AND get_current_user_role() IN ('owner', 'manager', 'stylist')
  );

CREATE POLICY "session_update" ON sessions
  FOR UPDATE USING (
    salon_id = get_current_user_salon_id()
    AND stylist_id = get_current_user_staff_id()
  );

-- transcripts ポリシー
CREATE POLICY "transcript_all" ON transcripts
  FOR ALL USING (
    session_id IN (
      SELECT id FROM sessions 
      WHERE salon_id = get_current_user_salon_id()
        AND (
          stylist_id = get_current_user_staff_id()
          OR get_current_user_role() IN ('owner', 'manager')
        )
    )
  );

-- speaker_segments ポリシー
CREATE POLICY "speaker_segment_all" ON speaker_segments
  FOR ALL USING (
    session_id IN (
      SELECT id FROM sessions 
      WHERE salon_id = get_current_user_salon_id()
        AND (
          stylist_id = get_current_user_staff_id()
          OR get_current_user_role() IN ('owner', 'manager')
        )
    )
  );

-- session_analyses ポリシー
CREATE POLICY "analysis_all" ON session_analyses
  FOR ALL USING (
    session_id IN (
      SELECT id FROM sessions 
      WHERE salon_id = get_current_user_salon_id()
        AND (
          stylist_id = get_current_user_staff_id()
          OR get_current_user_role() IN ('owner', 'manager')
        )
    )
  );

-- session_reports ポリシー
CREATE POLICY "report_all" ON session_reports
  FOR ALL USING (
    session_id IN (
      SELECT id FROM sessions 
      WHERE salon_id = get_current_user_salon_id()
        AND (
          stylist_id = get_current_user_staff_id()
          OR get_current_user_role() IN ('owner', 'manager')
        )
    )
  );

-- success_cases ポリシー
CREATE POLICY "success_case_select" ON success_cases
  FOR SELECT USING (
    is_public = true
    OR salon_id = get_current_user_salon_id()
  );

CREATE POLICY "success_case_insert" ON success_cases
  FOR INSERT WITH CHECK (
    salon_id = get_current_user_salon_id()
    AND get_current_user_role() IN ('owner', 'manager')
  );

CREATE POLICY "success_case_update" ON success_cases
  FOR UPDATE USING (
    salon_id = get_current_user_salon_id()
    AND get_current_user_role() IN ('owner', 'manager')
  );

CREATE POLICY "success_case_delete" ON success_cases
  FOR DELETE USING (
    salon_id = get_current_user_salon_id()
    AND get_current_user_role() = 'owner'
  );

-- roleplay_sessions ポリシー
CREATE POLICY "roleplay_select" ON roleplay_sessions
  FOR SELECT USING (
    staff_id = get_current_user_staff_id()
    OR get_current_user_role() IN ('owner', 'manager')
  );

CREATE POLICY "roleplay_insert" ON roleplay_sessions
  FOR INSERT WITH CHECK (
    staff_id = get_current_user_staff_id()
  );

CREATE POLICY "roleplay_update" ON roleplay_sessions
  FOR UPDATE USING (
    staff_id = get_current_user_staff_id()
  );

-- ============================================================
-- 関数・プロシージャ
-- ============================================================

-- ベクトル類似検索関数
CREATE OR REPLACE FUNCTION search_success_cases(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  p_salon_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  concern_keywords TEXT[],
  successful_talk TEXT,
  key_tactics TEXT[],
  sold_product VARCHAR,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.concern_keywords,
    sc.successful_talk,
    sc.key_tactics,
    sc.sold_product,
    1 - (sc.embedding <=> query_embedding) AS similarity
  FROM success_cases sc
  WHERE
    sc.embedding IS NOT NULL
    AND (sc.is_public = true OR sc.salon_id = p_salon_id)
    AND 1 - (sc.embedding <=> query_embedding) > match_threshold
  ORDER BY sc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- スタッフ統計取得関数
CREATE OR REPLACE FUNCTION get_staff_statistics(
  p_staff_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_sessions BIGINT,
  avg_score NUMERIC,
  conversion_count BIGINT,
  conversion_rate NUMERIC,
  total_duration_minutes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT s.id) AS total_sessions,
    COALESCE(ROUND(AVG(sr.overall_score), 1), 0) AS avg_score,
    COALESCE(
      SUM(CASE WHEN (sa.details->>'converted')::boolean = true THEN 1 ELSE 0 END),
      0
    ) AS conversion_count,
    COALESCE(
      ROUND(
        SUM(CASE WHEN (sa.details->>'converted')::boolean = true THEN 1 ELSE 0 END)::NUMERIC / 
        NULLIF(COUNT(DISTINCT s.id), 0) * 100,
        1
      ),
      0
    ) AS conversion_rate,
    COALESCE(
      SUM(EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) / 60)::BIGINT,
      0
    ) AS total_duration_minutes
  FROM sessions s
  LEFT JOIN session_reports sr ON sr.session_id = s.id
  LEFT JOIN session_analyses sa ON sa.session_id = s.id AND sa.indicator_type = 'conversion'
  WHERE
    s.stylist_id = p_staff_id
    AND s.status = 'completed'
    AND s.started_at >= p_start_date
    AND s.started_at <= p_end_date;
END;
$$;

-- 店舗統計取得関数
CREATE OR REPLACE FUNCTION get_salon_statistics(
  p_salon_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_sessions BIGINT,
  avg_score NUMERIC,
  conversion_rate NUMERIC,
  active_stylists BIGINT,
  top_performer_id UUID,
  top_performer_name VARCHAR,
  top_performer_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH session_stats AS (
    SELECT
      s.stylist_id,
      COUNT(*) AS session_count,
      AVG(sr.overall_score) AS avg_score
    FROM sessions s
    LEFT JOIN session_reports sr ON sr.session_id = s.id
    WHERE
      s.salon_id = p_salon_id
      AND s.status = 'completed'
      AND s.started_at >= p_start_date
      AND s.started_at <= p_end_date
    GROUP BY s.stylist_id
  ),
  top_performer AS (
    SELECT
      st.id,
      st.name,
      ss.avg_score
    FROM session_stats ss
    JOIN staffs st ON st.id = ss.stylist_id
    ORDER BY ss.avg_score DESC NULLS LAST
    LIMIT 1
  )
  SELECT
    (SELECT COUNT(*) FROM sessions WHERE salon_id = p_salon_id AND status = 'completed' AND started_at >= p_start_date AND started_at <= p_end_date) AS total_sessions,
    (SELECT ROUND(AVG(sr.overall_score), 1) FROM sessions s JOIN session_reports sr ON sr.session_id = s.id WHERE s.salon_id = p_salon_id AND s.status = 'completed' AND s.started_at >= p_start_date AND s.started_at <= p_end_date) AS avg_score,
    (SELECT ROUND(
      SUM(CASE WHEN (sa.details->>'converted')::boolean = true THEN 1 ELSE 0 END)::NUMERIC / 
      NULLIF(COUNT(DISTINCT s.id), 0) * 100, 1)
    FROM sessions s
    LEFT JOIN session_analyses sa ON sa.session_id = s.id AND sa.indicator_type = 'conversion'
    WHERE s.salon_id = p_salon_id AND s.status = 'completed' AND s.started_at >= p_start_date AND s.started_at <= p_end_date
    ) AS conversion_rate,
    (SELECT COUNT(DISTINCT stylist_id) FROM sessions WHERE salon_id = p_salon_id AND started_at >= p_start_date AND started_at <= p_end_date) AS active_stylists,
    tp.id AS top_performer_id,
    tp.name AS top_performer_name,
    ROUND(tp.avg_score, 1) AS top_performer_score
  FROM top_performer tp;
END;
$$;
```

### 7.2 インデックス設計

#### 7.2.1 インデックス一覧

| テーブル | インデックス名 | カラム | 種別 | 用途 |
|---------|--------------|--------|------|------|
| salons | idx_salons_plan | plan | B-tree | プラン別検索 |
| staffs | idx_staffs_salon_id | salon_id | B-tree | 店舗別スタッフ取得 |
| staffs | idx_staffs_auth_user_id | auth_user_id | B-tree | 認証ユーザー検索 |
| staffs | idx_staffs_salon_active | salon_id, is_active | B-tree (部分) | アクティブスタッフ取得 |
| sessions | idx_sessions_salon_started | salon_id, started_at | B-tree | 店舗別セッション履歴 |
| sessions | idx_sessions_stylist_started | stylist_id, started_at | B-tree | スタイリスト別履歴 |
| sessions | idx_sessions_active | stylist_id, status | B-tree (部分) | アクティブセッション検索 |
| transcripts | idx_transcripts_session_chunk | session_id, chunk_index | B-tree | チャンク順取得 |
| speaker_segments | idx_speaker_segments_session_time | session_id, start_time | B-tree | 時系列取得 |
| session_analyses | idx_session_analyses_session_indicator | session_id, indicator_type | B-tree | 指標別分析取得 |
| session_reports | idx_session_reports_score | overall_score | B-tree (DESC) | スコアランキング |
| success_cases | idx_success_cases_concern | concern_keywords | GIN | キーワード検索 |
| success_cases | idx_success_cases_embedding | embedding | HNSW | ベクトル類似検索 |

#### 7.2.2 パフォーマンスチューニング設定

```sql
-- PostgreSQL設定推奨値（Supabase Pro以上）

-- shared_buffers: メモリの25%程度
-- effective_cache_size: メモリの75%程度
-- work_mem: 64MB（複雑なソート・集計用）
-- maintenance_work_mem: 512MB（インデックス作成用）

-- HNSWインデックスの検索精度設定
SET hnsw.ef_search = 100;  -- 検索時の探索範囲（大きいほど精度↑、速度↓）

-- 統計情報の更新
ANALYZE salons;
ANALYZE staffs;
ANALYZE sessions;
ANALYZE transcripts;
ANALYZE speaker_segments;
ANALYZE session_analyses;
ANALYZE session_reports;
ANALYZE success_cases;
```

---

## 8. 画面項目詳細定義

### 8.1 iPad アプリ画面定義

#### 8.1.1 ログイン画面（iPad-001-Login）

| 項目ID | 項目名 | 種別 | データ型 | 必須 | 初期値 | バリデーション | 備考 |
|--------|-------|------|---------|------|--------|--------------|------|
| L001 | ロゴ | 画像 | - | - | - | - | SalonTalk AIロゴ |
| L002 | メールアドレス | テキスト入力 | string | ○ | - | email形式、255文字以内 | キーボード: email |
| L003 | パスワード | パスワード入力 | string | ○ | - | 8文字以上 | マスク表示 |
| L004 | パスワード表示切替 | トグル | boolean | - | false | - | タップでマスク解除 |
| L005 | ログインボタン | ボタン | - | - | - | - | Primary、Loading状態あり |
| L006 | パスワード忘れ | リンク | - | - | - | - | パスワードリセット画面へ |
| L007 | エラーメッセージ | テキスト | string | - | - | - | 赤色、エラー時表示 |

**画面状態**:

| 状態 | L002 | L003 | L005 | L007 |
|------|------|------|------|------|
| 初期 | enabled | enabled | disabled | hidden |
| 入力中 | enabled | enabled | enabled | hidden |
| 送信中 | disabled | disabled | loading | hidden |
| エラー | enabled | enabled | enabled | visible |

---

#### 8.1.2 ホーム画面（iPad-002-Home）

| 項目ID | 項目名 | 種別 | データ型 | 必須 | 初期値 | バリデーション | 備考 |
|--------|-------|------|---------|------|--------|--------------|------|
| H001 | ヘッダー | コンテナ | - | - | - | - | - |
| H002 | ユーザー名 | テキスト | string | - | - | - | {staff.name} |
| H003 | 店舗名 | テキスト | string | - | - | - | {salon.name} |
| H004 | 設定アイコン | ボタン | - | - | - | - | 設定画面へ |
| H010 | セッション開始ボタン | ボタン | - | - | - | - | Primary、大サイズ |
| H011 | アクティブセッション表示 | カード | - | - | - | - | 録音中セッションがある場合 |
| H020 | 今日の統計 | カード | - | - | - | - | - |
| H021 | セッション数 | テキスト | number | - | 0 | - | 今日のセッション数 |
| H022 | 平均スコア | テキスト | number | - | - | - | 今日の平均スコア |
| H023 | 成約数 | テキスト | number | - | 0 | - | 今日の成約数 |
| H030 | 最近のセッション | リスト | array | - | [] | - | 最新5件 |
| H031 | セッションカード | カード | object | - | - | - | タップで詳細へ |
| H040 | ナビゲーションバー | タブバー | - | - | - | - | ホーム/レポート/トレーニング/設定 |

**アクション**:

| 項目ID | イベント | アクション | 遷移先 |
|--------|---------|-----------|-------|
| H004 | tap | navigate | SettingsScreen |
| H010 | tap | openModal | SessionStartModal |
| H011 | tap | navigate | SessionScreen |
| H031 | tap | navigate | ReportDetailScreen |

---

#### 8.1.3 セッション画面（iPad-003-Session）

| 項目ID | 項目名 | 種別 | データ型 | 必須 | 初期値 | バリデーション | 備考 |
|--------|-------|------|---------|------|--------|--------------|------|
| S001 | 戻るボタン | ボタン | - | - | - | - | 確認ダイアログ表示 |
| S002 | タイトル | テキスト | string | - | "セッション中" | - | - |
| S003 | 経過時間 | テキスト | string | - | "00:00" | - | mm:ss形式、1秒更新 |
| S004 | 録音インジケータ | アイコン | - | - | - | - | 赤点滅 |
| S010 | リアルタイムスコアエリア | コンテナ | - | - | - | - | 上部20% |
| S011 | 傾聴スコアゲージ | プログレス | number | - | 0 | 0-100 | 円形ゲージ |
| S012 | スコア数値 | テキスト | number | - | 0 | - | 大きく表示 |
| S013 | 質問数 | テキスト | number | - | 0 | - | アイコン付き |
| S014 | 感情インジケータ | アイコン | string | - | "neutral" | - | 😊😐😞 |
| S015 | 悩みタグ | タグ群 | string[] | - | [] | - | 検出キーワード |
| S020 | 通知カード | カード | object | - | null | - | 条件表示 |
| S021 | 通知タイトル | テキスト | string | - | - | - | 🎯提案チャンス！など |
| S022 | 通知メッセージ | テキスト | string | - | - | - | - |
| S023 | 推奨商品 | テキスト | string | - | - | - | 条件付き |
| S024 | 成功トーク例 | テキスト | string | - | - | - | - |
| S025 | 閉じるボタン | ボタン | - | - | - | - | 通知を閉じる |
| S030 | 会話ログエリア | スクロールビュー | - | - | - | - | 中央50% |
| S031 | 会話ログリスト | リスト | array | - | [] | - | FlatList |
| S032 | 発話アイテム | カード | object | - | - | - | 話者別スタイル |
| S033 | 話者アイコン | アイコン | string | - | - | - | 👤/💇 |
| S034 | 話者ラベル | テキスト | string | - | - | - | スタイリスト/お客様 |
| S035 | タイムスタンプ | テキスト | string | - | - | - | HH:mm |
| S036 | 発話テキスト | テキスト | string | - | - | - | - |
| S040 | アクションエリア | コンテナ | - | - | - | - | 下部10% |
| S041 | 終了ボタン | ボタン | - | - | - | - | Danger、大サイズ |

**リアルタイム更新**:

| 項目ID | 更新トリガー | 更新頻度 | データソース |
|--------|------------|---------|------------|
| S003 | timer | 1秒 | ローカル計算 |
| S011-S015 | realtime:analysis | イベント | WebSocket |
| S020-S024 | realtime:notification | イベント | WebSocket |
| S031-S036 | speech:transcript | 随時 | SpeechAnalyzer |

**状態管理（Zustand）**:

```typescript
interface SessionState {
  session: Session | null;
  isRecording: boolean;
  elapsedSeconds: number;
  currentScore: number;
  questionCount: number;
  emotion: 'positive' | 'neutral' | 'negative';
  concernTags: string[];
  notification: Notification | null;
  conversationLog: ConversationTurn[];
  
  // Actions
  startSession: (params: CreateSessionParams) => Promise<void>;
  endSession: () => Promise<void>;
  updateAnalysis: (analysis: AnalysisPayload) => void;
  addConversationTurn: (turn: ConversationTurn) => void;
  showNotification: (notification: Notification) => void;
  dismissNotification: () => void;
}
```

---

#### 8.1.4 レポート詳細画面（iPad-005-ReportDetail）

| 項目ID | 項目名 | 種別 | データ型 | 必須 | 初期値 | バリデーション | 備考 |
|--------|-------|------|---------|------|--------|--------------|------|
| R001 | 戻るボタン | ボタン | - | - | - | - | レポート一覧へ |
| R002 | 共有ボタン | ボタン | - | - | - | - | PDF出力 |
| R010 | 総合スコアカード | カード | - | - | - | - | - |
| R011 | スコア数値 | テキスト | number | - | - | 0-100 | 大きく表示 |
| R012 | スコアランク | バッジ | string | - | - | - | S/A/B/C/D |
| R013 | 日時 | テキスト | string | - | - | - | YYYY/MM/DD HH:mm |
| R014 | 施術時間 | テキスト | string | - | - | - | mm分 |
| R020 | 指標スコアセクション | コンテナ | - | - | - | - | - |
| R021 | 指標カード | カード | object | - | - | - | 7指標分 |
| R022 | 指標名 | テキスト | string | - | - | - | - |
| R023 | 指標スコア | テキスト | number | - | - | - | - |
| R024 | 指標ゲージ | プログレス | number | - | - | 0-100 | - |
| R030 | 良かった点セクション | コンテナ | - | - | - | - | - |
| R031 | 良かった点リスト | リスト | string[] | - | [] | - | ✓アイコン |
| R040 | 改善ポイントセクション | コンテナ | - | - | - | - | - |
| R041 | 改善ポイントリスト | リスト | string[] | - | [] | - | !アイコン |
| R050 | アクションアイテムセクション | コンテナ | - | - | - | - | - |
| R051 | アクションアイテムリスト | リスト | string[] | - | [] | - | 番号付き |
| R060 | AI フィードバックセクション | カード | - | - | - | - | - |
| R061 | フィードバックテキスト | テキスト | string | - | - | - | 折りたたみ可 |
| R070 | 会話要約セクション | カード | - | - | - | - | - |
| R071 | 要約テキスト | テキスト | string | - | - | - | - |

---

### 8.2 Web ダッシュボード画面定義

#### 8.2.1 ダッシュボード画面（Web-003-Dashboard）

| 項目ID | 項目名 | 種別 | データ型 | 必須 | 初期値 | バリデーション | 備考 |
|--------|-------|------|---------|------|--------|--------------|------|
| D001 | ヘッダー | コンテナ | - | - | - | - | - |
| D002 | ロゴ | 画像 | - | - | - | - | - |
| D003 | 通知アイコン | ボタン | - | - | - | - | バッジ付き |
| D004 | ユーザーメニュー | ドロップダウン | - | - | - | - | - |
| D010 | サイドバー | コンテナ | - | - | - | - | 240px幅 |
| D011 | ナビ：ダッシュボード | リンク | - | - | - | - | アクティブ |
| D012 | ナビ：スタッフ | リンク | - | - | - | - | - |
| D013 | ナビ：分析 | リンク | - | - | - | - | - |
| D014 | ナビ：成功事例 | リンク | - | - | - | - | - |
| D015 | ナビ：設定 | リンク | - | - | - | - | - |
| D020 | メインコンテンツ | コンテナ | - | - | - | - | - |
| D030 | 期間フィルター | セレクト | string | - | "today" | - | 今日/週/月/カスタム |
| D040 | サマリーカード群 | コンテナ | - | - | - | - | 4カード横並び |
| D041 | 今日のセッション | カード | object | - | - | - | 数値+増減 |
| D042 | 平均スコア | カード | object | - | - | - | 数値+増減 |
| D043 | 成約率 | カード | object | - | - | - | %+増減 |
| D044 | 活動スタッフ | カード | object | - | - | - | n/total |
| D050 | スコア推移グラフ | チャート | array | - | [] | - | Line Chart |
| D051 | X軸 | - | - | - | - | - | 日付 |
| D052 | Y軸 | - | - | - | - | - | スコア0-100 |
| D053 | 凡例 | - | - | - | - | - | 平均/最高/最低 |
| D060 | スタッフランキング | テーブル | array | - | [] | - | Top 10 |
| D061 | 順位 | テキスト | number | - | - | - | - |
| D062 | スタッフ名 | テキスト | string | - | - | - | - |
| D063 | 平均スコア | テキスト | number | - | - | - | - |
| D064 | セッション数 | テキスト | number | - | - | - | - |
| D065 | 成約率 | テキスト | number | - | - | - | % |
| D070 | 最近のセッション | テーブル | array | - | [] | - | - |
| D071 | 日時 | テキスト | string | - | - | - | - |
| D072 | スタイリスト | テキスト | string | - | - | - | - |
| D073 | スコア | バッジ | number | - | - | - | 色分け |
| D074 | 施術時間 | テキスト | string | - | - | - | - |
| D075 | 詳細リンク | ボタン | - | - | - | - | - |

**データフェッチ（SWR）**:

```typescript
// hooks/useDashboardData.ts

export function useDashboardData(period: Period) {
  const { salonId } = useAuth();
  
  const { data: summary, error: summaryError } = useSWR(
    salonId ? `/api/dashboard/summary?salonId=${salonId}&period=${period}` : null,
    fetcher,
    { refreshInterval: 60000 }  // 1分ごと更新
  );

  const { data: scoreHistory, error: historyError } = useSWR(
    salonId ? `/api/dashboard/score-history?salonId=${salonId}&period=${period}` : null,
    fetcher
  );

  const { data: ranking, error: rankingError } = useSWR(
    salonId ? `/api/dashboard/ranking?salonId=${salonId}&period=${period}` : null,
    fetcher
  );

  const { data: recentSessions, error: sessionsError } = useSWR(
    salonId ? `/api/dashboard/recent-sessions?salonId=${salonId}&limit=10` : null,
    fetcher,
    { refreshInterval: 30000 }  // 30秒ごと更新
  );

  return {
    summary,
    scoreHistory,
    ranking,
    recentSessions,
    isLoading: !summary && !summaryError,
    error: summaryError || historyError || rankingError || sessionsError,
  };
}
```

---

### 8.3 入力バリデーション定義

#### 8.3.1 共通バリデーションルール

| ルール名 | 正規表現/条件 | エラーメッセージ |
|---------|-------------|----------------|
| required | value !== null && value !== '' | {項目名}は必須です |
| email | /^[^\s@]+@[^\s@]+\.[^\s@]+$/ | 有効なメールアドレスを入力してください |
| minLength(n) | value.length >= n | {項目名}は{n}文字以上で入力してください |
| maxLength(n) | value.length <= n | {項目名}は{n}文字以内で入力してください |
| pattern(regex) | regex.test(value) | {項目名}の形式が正しくありません |
| min(n) | value >= n | {項目名}は{n}以上で入力してください |
| max(n) | value <= n | {項目名}は{n}以下で入力してください |
| uuid | UUID形式 | 無効なIDです |

#### 8.3.2 フォーム別バリデーションスキーマ

```typescript
// schemas/validation.ts

import { z } from 'zod';

// ログインフォーム
export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスは必須です')
    .email('有効なメールアドレスを入力してください')
    .max(255, 'メールアドレスは255文字以内で入力してください'),
  password: z
    .string()
    .min(1, 'パスワードは必須です')
    .min(8, 'パスワードは8文字以上で入力してください'),
});

// セッション開始フォーム
export const SessionStartSchema = z.object({
  customerInfo: z.object({
    ageGroup: z.enum(['10s', '20s', '30s', '40s', '50s', '60s+']).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    visitFrequency: z.enum(['first', 'monthly', 'bimonthly', 'quarterly', 'irregular']).optional(),
    notes: z.string().max(500, 'メモは500文字以内で入力してください').optional(),
  }).optional(),
});

// スタッフ作成フォーム
export const CreateStaffSchema = z.object({
  name: z
    .string()
    .min(1, '氏名は必須です')
    .max(50, '氏名は50文字以内で入力してください'),
  email: z
    .string()
    .min(1, 'メールアドレスは必須です')
    .email('有効なメールアドレスを入力してください')
    .max(255, 'メールアドレスは255文字以内で入力してください'),
  role: z.enum(['owner', 'manager', 'stylist', 'assistant'], {
    errorMap: () => ({ message: 'ロールを選択してください' }),
  }),
  position: z.string().max(50, '役職は50文字以内で入力してください').optional(),
  joinDate: z.string().date('有効な日付を入力してください').optional(),
});

// 成功事例登録フォーム
export const CreateSuccessCaseSchema = z.object({
  concernKeywords: z
    .array(z.string())
    .min(1, '悩みキーワードを1つ以上入力してください')
    .max(10, '悩みキーワードは10個以内で入力してください'),
  successfulTalk: z
    .string()
    .min(10, '成功トーク例は10文字以上で入力してください')
    .max(2000, '成功トーク例は2000文字以内で入力してください'),
  keyTactics: z
    .array(z.string())
    .min(1, 'キーポイントを1つ以上入力してください')
    .max(5, 'キーポイントは5個以内で入力してください'),
  soldProduct: z.string().max(100, '商品名は100文字以内で入力してください').optional(),
  isPublic: z.boolean().default(false),
});

// 店舗設定フォーム
export const SalonSettingsSchema = z.object({
  name: z
    .string()
    .min(1, '店舗名は必須です')
    .max(100, '店舗名は100文字以内で入力してください'),
  address: z.string().max(500, '住所は500文字以内で入力してください').optional(),
  phone: z
    .string()
    .regex(/^[\d-]+$/, '電話番号は数字とハイフンのみで入力してください')
    .max(20, '電話番号は20文字以内で入力してください')
    .optional(),
  settings: z.object({
    notification: z.object({
      enablePush: z.boolean(),
      enableEmail: z.boolean(),
      concernDetectionAlert: z.boolean(),
      sessionCompleteAlert: z.boolean(),
    }),
    analysis: z.object({
      idealTalkRatio: z.number().min(20).max(60),
      minQuestionCount: z.number().min(1).max(20),
      concernKeywords: z.array(z.string()),
    }),
    display: z.object({
      showRanking: z.boolean(),
      anonymizeCustomer: z.boolean(),
    }),
  }),
});
```

---

（続きは Part 6 に記載: 外部連携詳細設計、エラーハンドリング詳細、テスト仕様）
# 詳細設計書 Part 6: 外部連携詳細設計・エラーハンドリング詳細・テスト仕様・付録

---

## 9. 外部連携詳細設計

### 9.1 Anthropic Claude API 連携

#### 9.1.1 クライアント実装

```typescript
// src/lib/claude/client.ts

import Anthropic from '@anthropic-ai/sdk';

interface ClaudeClientConfig {
  apiKey: string;
  maxRetries?: number;
  timeout?: number;
}

export class ClaudeClient {
  private client: Anthropic;
  private maxRetries: number;
  private timeout: number;

  constructor(config: ClaudeClientConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.maxRetries = config.maxRetries ?? 3;
    this.timeout = config.timeout ?? 60000;
  }

  /**
   * メッセージ送信
   */
  async sendMessage(params: {
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    maxTokens?: number;
    temperature?: number;
  }): Promise<ClaudeResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: params.maxTokens ?? 4096,
          system: params.system,
          messages: params.messages,
          temperature: params.temperature ?? 1,
        });

        return {
          content: response.content[0].type === 'text' 
            ? response.content[0].text 
            : '',
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
          stopReason: response.stop_reason,
        };
      } catch (error: any) {
        lastError = error;
        
        // リトライ可能なエラーかチェック
        if (this.shouldRetry(error, attempt)) {
          const delay = this.calculateBackoff(attempt, error);
          console.log(`Claude API retry attempt ${attempt}/${this.maxRetries}, waiting ${delay}ms`);
          await this.sleep(delay);
          continue;
        }
        
        throw this.wrapError(error);
      }
    }
    
    throw this.wrapError(lastError!);
  }

  /**
   * JSON形式で応答を要求
   */
  async sendMessageForJson<T>(params: {
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    maxTokens?: number;
  }): Promise<T> {
    const response = await this.sendMessage({
      ...params,
      temperature: 0,  // JSONの場合は温度を0に
    });

    // JSON抽出
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new ClaudeError('PARSE_ERROR', 'JSONレスポンスの解析に失敗しました');
    }

    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch {
      throw new ClaudeError('PARSE_ERROR', 'JSONレスポンスの解析に失敗しました');
    }
  }

  /**
   * リトライ判定
   */
  private shouldRetry(error: any, attempt: number): boolean {
    if (attempt >= this.maxRetries) return false;
    
    // レート制限エラー
    if (error.status === 429) return true;
    
    // サーバーエラー
    if (error.status >= 500) return true;
    
    // ネットワークエラー
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
    
    return false;
  }

  /**
   * バックオフ時間計算
   */
  private calculateBackoff(attempt: number, error: any): number {
    // レート制限の場合はRetry-Afterヘッダーを使用
    if (error.status === 429 && error.headers?.['retry-after']) {
      return parseInt(error.headers['retry-after'], 10) * 1000;
    }
    
    // 指数バックオフ + ジッター
    const baseDelay = error.status === 429 ? 5000 : 1000;
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    
    return Math.min(exponentialDelay + jitter, 60000);  // 最大60秒
  }

  /**
   * エラーラップ
   */
  private wrapError(error: any): ClaudeError {
    if (error instanceof ClaudeError) return error;
    
    const status = error.status || 500;
    const message = error.message || 'Claude API エラー';
    
    if (status === 401) {
      return new ClaudeError('AUTH_ERROR', 'APIキーが無効です', error);
    }
    if (status === 429) {
      return new ClaudeError('RATE_LIMIT', 'レート制限に達しました', error);
    }
    if (status >= 500) {
      return new ClaudeError('SERVER_ERROR', 'Claudeサーバーエラー', error);
    }
    
    return new ClaudeError('UNKNOWN', message, error);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface ClaudeResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason: string | null;
}

export class ClaudeError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ClaudeError';
  }
}
```

#### 9.1.2 プロンプトテンプレート

```typescript
// src/lib/claude/prompts.ts

/**
 * 感情分析プロンプト
 */
export const EMOTION_ANALYSIS_PROMPT = `あなたは美容室でのお客様の発話を分析する専門家です。
以下のお客様の発話から感情を分析してください。

## 発話内容
{customerUtterances}

## 分析観点
1. ポジティブな感情（喜び、満足、期待、興味）
2. ネガティブな感情（不満、困惑、不安、悩み）
3. ニュートラルな発話

## 出力形式（JSON）
{
  "positiveRatio": 0-100の数値（ポジティブ発話の割合%）,
  "keywords": ["検出された感情キーワードの配列"],
  "overall": "positive" | "neutral" | "negative"
}

JSONのみを出力してください。説明は不要です。`;

/**
 * 提案品質分析プロンプト
 */
export const PROPOSAL_QUALITY_PROMPT = `あなたは美容室での店販提案を分析する専門家です。
以下のスタイリストの発話から、商品提案の品質を分析してください。

## スタイリストの発話
{stylistUtterances}

## 分析観点
1. 商品提案があるか
2. ベネフィット（お客様にとっての効果・メリット）を伝えているか
3. スペック（成分・機能）だけでなく、感情的価値を伝えているか

## 良い提案の例
- 「これを使うと朝のスタイリングが5分短くなりますよ」（時短=ベネフィット）
- 「サラサラになって、触るのが楽しくなりますよ」（感情的価値）

## 悪い提案の例
- 「オーガニック成分配合です」（スペックのみ）
- 「3000円です」（価格のみ）

## 出力形式（JSON）
{
  "hasProposal": true | false,
  "benefitRatio": 0-100の数値（ベネフィット訴求の割合%）,
  "examples": ["提案内容の具体例"]
}

JSONのみを出力してください。`;

/**
 * 成約判定プロンプト
 */
export const CONVERSION_DETECTION_PROMPT = `あなたは美容室での会話から商品購入を検出する専門家です。
以下の会話から、商品の購入（成約）があったかを判定してください。

## 会話
{conversation}

## 判定基準
- お客様が「買います」「ください」「お願いします」などの購入意思を示した
- スタイリストが「ありがとうございます」と購入確認をした
- 会計や包装の話が出た

## 出力形式（JSON）
{
  "converted": true | false,
  "productName": "購入された商品名" | null,
  "confidence": 0-100の確信度
}

JSONのみを出力してください。`;

/**
 * レポート生成プロンプト
 */
export const REPORT_GENERATION_PROMPT = `あなたは美容室のセッション分析レポートを作成する専門家です。
以下の分析結果に基づいて、スタイリスト向けのフィードバックレポートを作成してください。

## 会話要約
{transcriptSummary}

## 分析結果
- 総合スコア: {overallScore}点
- トーク比率: {talkRatioScore}点（スタイリスト{talkRatioValue}%）
- 質問分析: {questionScore}点（{questionCount}回）
- 感情分析: {emotionScore}点（ポジティブ{emotionValue}%）
- 悩み検出: {concernDetected}
- 提案品質: {proposalScore}点
- 成約: {converted}

## 出力形式（JSON）
{
  "goodPoints": ["良かった点を2-3個、具体的に"],
  "improvementPoints": ["改善ポイントを2-3個、具体的に"],
  "actionItems": ["次回への具体的なアクションを3個"],
  "transcriptSummary": "会話の要約（100文字程度）",
  "aiFeedback": "総合的なフィードバック（200文字程度、励ましを含めて）"
}

JSONのみを出力してください。スタイリストを励ます温かいトーンで書いてください。`;

/**
 * ロールプレイお客様役プロンプト
 */
export const ROLEPLAY_CUSTOMER_PROMPT = `あなたは美容室のお客様役としてロールプレイに参加します。

## シナリオ
{scenario}

## キャラクター設定
{characterSettings}

## ルール
1. 設定されたお客様として自然に応答してください
2. スタイリストの質問や提案に対して、リアルな反応をしてください
3. 設定された悩みや性格に一貫性を持ってください
4. 長すぎる応答は避け、自然な会話のペースを維持してください

## これまでの会話
{conversationHistory}

## スタイリストの発話
{stylistMessage}

お客様として1-2文で応答してください。応答のみを出力し、説明は不要です。`;

/**
 * プロンプト変数置換
 */
export function formatPrompt(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}
```

### 9.2 OpenAI Embedding API 連携

```typescript
// src/lib/openai/embedding.ts

interface EmbeddingClientConfig {
  apiKey: string;
  model?: string;
}

export class EmbeddingClient {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(config: EmbeddingClientConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'text-embedding-3-small';
  }

  /**
   * 単一テキストのEmbedding生成
   */
  async createEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new EmbeddingError(
        response.status,
        error.error?.message || 'Embedding生成に失敗しました'
      );
    }

    const result = await response.json();
    return result.data[0].embedding;
  }

  /**
   * バッチEmbedding生成（最大20件）
   */
  async createEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    if (texts.length > 20) {
      throw new EmbeddingError(400, 'バッチサイズは20件以内にしてください');
    }

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new EmbeddingError(
        response.status,
        error.error?.message || 'Embedding生成に失敗しました'
      );
    }

    const result = await response.json();
    return result.data
      .sort((a: any, b: any) => a.index - b.index)
      .map((item: any) => item.embedding);
  }
}

export class EmbeddingError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'EmbeddingError';
  }
}
```

### 9.3 pyannote Server 連携

```typescript
// src/lib/pyannote/client.ts

interface PyannoteClientConfig {
  serverUrl: string;
  apiKey: string;
  timeout?: number;
}

interface DiarizeParams {
  sessionId: string;
  audioFile: Blob;
  callbackUrl: string;
  numSpeakers?: number;
  chunkIndex?: number;
}

interface DiarizeResponse {
  status: 'processing';
  sessionId: string;
  estimatedTime: number;
}

interface DiarizationResult {
  sessionId: string;
  status: 'completed' | 'failed';
  segments?: Array<{
    speaker: string;
    start: number;
    end: number;
    confidence?: number;
  }>;
  error?: string;
}

export class PyannoteClient {
  private serverUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(config: PyannoteClientConfig) {
    this.serverUrl = config.serverUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 300000;  // 5分
  }

  /**
   * 話者分離リクエスト送信
   */
  async diarize(params: DiarizeParams): Promise<DiarizeResponse> {
    const formData = new FormData();
    formData.append('audio', params.audioFile, 'audio.wav');
    formData.append('callback_url', params.callbackUrl);
    formData.append('num_speakers', String(params.numSpeakers ?? 2));
    if (params.chunkIndex !== undefined) {
      formData.append('chunk_index', String(params.chunkIndex));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(
        `${this.serverUrl}/diarize/${params.sessionId}`,
        {
          method: 'POST',
          headers: {
            'X-API-Key': this.apiKey,
          },
          body: formData,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new PyannoteError(response.status, error);
      }

      const result = await response.json();
      return {
        status: 'processing',
        sessionId: result.session_id,
        estimatedTime: result.estimated_time,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new PyannoteError(408, 'リクエストがタイムアウトしました');
      }
      
      throw error instanceof PyannoteError 
        ? error 
        : new PyannoteError(500, error.message);
    }
  }

  /**
   * 処理状態確認
   */
  async getStatus(sessionId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
  }> {
    const response = await fetch(
      `${this.serverUrl}/status/${sessionId}`,
      {
        headers: {
          'X-API-Key': this.apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new PyannoteError(response.status, 'ステータス取得に失敗しました');
    }

    return response.json();
  }

  /**
   * ヘルスチェック
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/health`, {
        timeout: 5000,
      } as any);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export class PyannoteError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'PyannoteError';
  }
}

/**
 * 話者ラベルをアプリケーション用に変換
 */
export function mapSpeakerLabel(
  pyannoteLabel: string,
  firstSpeaker: string
): 'stylist' | 'customer' | 'unknown' {
  // 最初に発話した人をスタイリストと仮定
  if (pyannoteLabel === firstSpeaker) {
    return 'stylist';
  }
  if (pyannoteLabel.startsWith('SPEAKER_')) {
    return 'customer';
  }
  return 'unknown';
}
```

---

## 10. エラーハンドリング詳細

### 10.1 エラーコード体系

```typescript
// src/errors/errorCodes.ts

/**
 * エラーコード定義
 */
export const ErrorCodes = {
  // 認証エラー (AUTH_xxx)
  AUTH_001: { code: 'AUTH_001', message: '認証トークンが無効です', httpStatus: 401 },
  AUTH_002: { code: 'AUTH_002', message: 'トークンの有効期限が切れています', httpStatus: 401 },
  AUTH_003: { code: 'AUTH_003', message: 'この操作を行う権限がありません', httpStatus: 403 },
  AUTH_004: { code: 'AUTH_004', message: 'アカウントが無効です', httpStatus: 403 },

  // バリデーションエラー (VAL_xxx)
  VAL_001: { code: 'VAL_001', message: '必須項目が入力されていません', httpStatus: 400 },
  VAL_002: { code: 'VAL_002', message: '入力形式が正しくありません', httpStatus: 400 },
  VAL_003: { code: 'VAL_003', message: '入力値が範囲外です', httpStatus: 400 },
  VAL_004: { code: 'VAL_004', message: 'ファイルサイズが上限を超えています', httpStatus: 400 },
  VAL_005: { code: 'VAL_005', message: 'ファイル形式がサポートされていません', httpStatus: 400 },

  // セッションエラー (SES_xxx)
  SES_001: { code: 'SES_001', message: 'セッションが見つかりません', httpStatus: 404 },
  SES_002: { code: 'SES_002', message: 'セッションは既に終了しています', httpStatus: 400 },
  SES_003: { code: 'SES_003', message: 'セッションは処理中です', httpStatus: 409 },
  SES_004: { code: 'SES_004', message: '既にアクティブなセッションがあります', httpStatus: 409 },

  // AI処理エラー (AI_xxx)
  AI_001: { code: 'AI_001', message: 'AI分析処理に失敗しました', httpStatus: 500 },
  AI_002: { code: 'AI_002', message: 'AI APIのレート制限に達しました', httpStatus: 429 },
  AI_003: { code: 'AI_003', message: 'AI処理がタイムアウトしました', httpStatus: 504 },

  // 話者分離エラー (DIA_xxx)
  DIA_001: { code: 'DIA_001', message: '話者分離処理に失敗しました', httpStatus: 500 },
  DIA_002: { code: 'DIA_002', message: '話者分離がタイムアウトしました', httpStatus: 504 },
  DIA_003: { code: 'DIA_003', message: '話者分離サーバーに接続できません', httpStatus: 503 },

  // データベースエラー (DB_xxx)
  DB_001: { code: 'DB_001', message: 'データベースに接続できません', httpStatus: 500 },
  DB_002: { code: 'DB_002', message: 'データの取得に失敗しました', httpStatus: 500 },
  DB_003: { code: 'DB_003', message: 'データの保存に失敗しました', httpStatus: 500 },
  DB_004: { code: 'DB_004', message: 'データが既に存在します', httpStatus: 409 },

  // ネットワークエラー (NET_xxx)
  NET_001: { code: 'NET_001', message: 'ネットワークに接続できません', httpStatus: 503 },
  NET_002: { code: 'NET_002', message: '通信がタイムアウトしました', httpStatus: 504 },

  // ストレージエラー (STR_xxx)
  STR_001: { code: 'STR_001', message: 'ファイルのアップロードに失敗しました', httpStatus: 500 },
  STR_002: { code: 'STR_002', message: 'ファイルのダウンロードに失敗しました', httpStatus: 500 },

  // システムエラー (SYS_xxx)
  SYS_001: { code: 'SYS_001', message: 'システムエラーが発生しました', httpStatus: 500 },
} as const;

export type ErrorCode = keyof typeof ErrorCodes;
```

### 10.2 エラーハンドリングクラス

```typescript
// src/errors/AppError.ts

import { ErrorCodes, ErrorCode } from './errorCodes';

/**
 * アプリケーションエラー基底クラス
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly details?: Record<string, unknown>;
  public readonly cause?: Error;

  constructor(
    errorCode: ErrorCode,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    const errorDef = ErrorCodes[errorCode];
    super(errorDef.message);
    
    this.name = 'AppError';
    this.code = errorDef.code;
    this.httpStatus = errorDef.httpStatus;
    this.details = details;
    this.cause = cause;
    
    // スタックトレースを保持
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * JSONシリアライズ用
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }

  /**
   * ログ出力用
   */
  toLogObject() {
    return {
      errorCode: this.code,
      message: this.message,
      httpStatus: this.httpStatus,
      details: this.details,
      stack: this.stack,
      cause: this.cause?.message,
    };
  }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    fieldErrors?: Record<string, string[]>
  ) {
    super('VAL_001', { message, fieldErrors });
    this.name = 'ValidationError';
  }
}

/**
 * 認証エラー
 */
export class AuthenticationError extends AppError {
  constructor(errorCode: 'AUTH_001' | 'AUTH_002' | 'AUTH_003' | 'AUTH_004' = 'AUTH_001') {
    super(errorCode);
    this.name = 'AuthenticationError';
  }
}

/**
 * リソース未検出エラー
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super('SES_001', { resource, id });
    this.message = `${resource}が見つかりません`;
    this.name = 'NotFoundError';
  }
}
```

### 10.3 グローバルエラーハンドラー

```typescript
// src/errors/errorHandler.ts

import { AppError } from './AppError';

/**
 * Edge Function用エラーハンドラー
 */
export function handleEdgeFunctionError(error: unknown): Response {
  console.error('Edge Function Error:', error);

  if (error instanceof AppError) {
    return new Response(
      JSON.stringify(error.toJSON()),
      {
        status: error.httpStatus,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 予期しないエラー
  const appError = new AppError('SYS_001', { 
    originalMessage: error instanceof Error ? error.message : 'Unknown error' 
  });
  
  return new Response(
    JSON.stringify(appError.toJSON()),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * React Native用エラーハンドラー
 */
export function handleClientError(error: unknown): {
  code: string;
  message: string;
  isRetryable: boolean;
} {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      isRetryable: isRetryableError(error.code),
    };
  }

  // ネットワークエラーの検出
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      code: 'NET_001',
      message: 'ネットワークに接続できません',
      isRetryable: true,
    };
  }

  return {
    code: 'SYS_001',
    message: 'エラーが発生しました',
    isRetryable: false,
  };
}

/**
 * リトライ可能なエラーか判定
 */
function isRetryableError(code: string): boolean {
  const retryableCodes = [
    'AI_002',   // レート制限
    'AI_003',   // タイムアウト
    'DIA_001',  // 話者分離失敗
    'DIA_002',  // 話者分離タイムアウト
    'DIA_003',  // サーバー接続失敗
    'DB_001',   // DB接続失敗
    'NET_001',  // ネットワーク接続失敗
    'NET_002',  // ネットワークタイムアウト
    'STR_001',  // アップロード失敗
  ];
  
  return retryableCodes.includes(code);
}
```

### 10.4 リトライユーティリティ

```typescript
// src/utils/retry.ts

interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any, delay: number) => void;
}

const defaultOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  jitter: true,
};

/**
 * リトライ付き関数実行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // リトライ条件チェック
      if (opts.retryCondition && !opts.retryCondition(error)) {
        throw error;
      }

      // 最後の試行ならエラーをスロー
      if (attempt === opts.maxAttempts) {
        throw error;
      }

      // 遅延計算
      let delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffFactor, attempt - 1),
        opts.maxDelay
      );

      // ジッター追加
      if (opts.jitter) {
        delay += Math.random() * 1000;
      }

      // コールバック
      opts.onRetry?.(attempt, error, delay);

      // 待機
      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 使用例
 */
export const retryPresets = {
  // Claude API用
  claudeApi: {
    maxAttempts: 3,
    initialDelay: 2000,
    maxDelay: 60000,
    backoffFactor: 2,
    jitter: true,
    retryCondition: (error: any) => {
      return error.status === 429 || error.status >= 500;
    },
  },

  // pyannote Server用
  pyannote: {
    maxAttempts: 2,
    initialDelay: 5000,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: false,
  },

  // データベース用
  database: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    jitter: true,
    retryCondition: (error: any) => {
      return error.code === 'ECONNRESET' || error.message?.includes('connection');
    },
  },
};
```

---

## 11. テスト仕様

### 11.1 単体テスト仕様

#### 11.1.1 トーク比率計算テスト

```typescript
// __tests__/analysis/talkRatioAnalyzer.test.ts

import { describe, it, expect } from 'vitest';
import { analyzeTalkRatio } from '@/domain/services/analysis/talkRatioAnalyzer';

describe('analyzeTalkRatio', () => {
  describe('スコア計算', () => {
    it('理想的な比率（40%）で100点を返す', () => {
      const segments = [
        { speaker: 'stylist', startTime: 0, endTime: 40 },
        { speaker: 'customer', startTime: 40, endTime: 100 },
      ];
      
      const result = analyzeTalkRatio(segments as any);
      
      expect(result.score).toBe(100);
      expect(result.value).toBe(40);
    });

    it('許容範囲（35-45%）で100点を返す', () => {
      const segments = [
        { speaker: 'stylist', startTime: 0, endTime: 45 },
        { speaker: 'customer', startTime: 45, endTime: 100 },
      ];
      
      const result = analyzeTalkRatio(segments as any);
      
      expect(result.score).toBe(100);
    });

    it('やや乖離（30-35%）で80点を返す', () => {
      const segments = [
        { speaker: 'stylist', startTime: 0, endTime: 32 },
        { speaker: 'customer', startTime: 32, endTime: 100 },
      ];
      
      const result = analyzeTalkRatio(segments as any);
      
      expect(result.score).toBe(80);
    });

    it('大きく乖離（25%未満）で40点を返す', () => {
      const segments = [
        { speaker: 'stylist', startTime: 0, endTime: 20 },
        { speaker: 'customer', startTime: 20, endTime: 100 },
      ];
      
      const result = analyzeTalkRatio(segments as any);
      
      expect(result.score).toBe(40);
    });
  });

  describe('エッジケース', () => {
    it('セグメントが空の場合、デフォルト値を返す', () => {
      const result = analyzeTalkRatio([]);
      
      expect(result.score).toBe(50);
      expect(result.value).toBe(50);
    });

    it('unknownスピーカーは無視される', () => {
      const segments = [
        { speaker: 'stylist', startTime: 0, endTime: 40 },
        { speaker: 'customer', startTime: 40, endTime: 100 },
        { speaker: 'unknown', startTime: 100, endTime: 150 },
      ];
      
      const result = analyzeTalkRatio(segments as any);
      
      expect(result.details.totalSeconds).toBe(100);
    });
  });
});
```

#### 11.1.2 質問検出テスト

```typescript
// __tests__/analysis/questionAnalyzer.test.ts

import { describe, it, expect } from 'vitest';
import { analyzeQuestions } from '@/domain/services/analysis/questionAnalyzer';

describe('analyzeQuestions', () => {
  describe('質問検出', () => {
    it('疑問符で終わる発話を質問として検出する', () => {
      const conversation = [
        { speaker: 'stylist', text: '今日はどうされますか？', startTime: 0, endTime: 5 },
      ];
      
      const result = analyzeQuestions(conversation as any);
      
      expect(result.details.totalQuestions).toBe(1);
    });

    it('「〜ですか」で終わる発話を質問として検出する', () => {
      const conversation = [
        { speaker: 'stylist', text: '前回と同じでいいですか', startTime: 0, endTime: 5 },
      ];
      
      const result = analyzeQuestions(conversation as any);
      
      expect(result.details.totalQuestions).toBe(1);
    });

    it('お客様の発話は質問としてカウントしない', () => {
      const conversation = [
        { speaker: 'customer', text: 'どうしたらいいですか？', startTime: 0, endTime: 5 },
      ];
      
      const result = analyzeQuestions(conversation as any);
      
      expect(result.details.totalQuestions).toBe(0);
    });
  });

  describe('オープン/クローズド判定', () => {
    it('「どう〜」で始まる質問はオープンクエスチョン', () => {
      const conversation = [
        { speaker: 'stylist', text: 'どうされたいですか？', startTime: 0, endTime: 5 },
      ];
      
      const result = analyzeQuestions(conversation as any);
      
      expect(result.details.openQuestions).toBe(1);
    });

    it('「〜ですか」のみはクローズドクエスチョン', () => {
      const conversation = [
        { speaker: 'stylist', text: '短くしますか？', startTime: 0, endTime: 5 },
      ];
      
      const result = analyzeQuestions(conversation as any);
      
      expect(result.details.closedQuestions).toBe(1);
    });
  });

  describe('スコア計算', () => {
    it('8-12回でオープン60%以上は100点', () => {
      const conversation = Array(10).fill(null).map((_, i) => ({
        speaker: 'stylist',
        text: i < 6 ? 'どうですか？' : 'いいですか？',
        startTime: i * 10,
        endTime: (i + 1) * 10,
      }));
      
      const result = analyzeQuestions(conversation as any);
      
      expect(result.score).toBe(100);
    });
  });
});
```

### 11.2 結合テスト仕様

```typescript
// __tests__/integration/sessionFlow.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('セッションフロー結合テスト', () => {
  let supabase: any;
  let testUserId: string;
  let testSalonId: string;
  let testStaffId: string;

  beforeAll(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // テストデータセットアップ
    const { data: salon } = await supabase
      .from('salons')
      .insert({ name: 'Test Salon' })
      .select()
      .single();
    testSalonId = salon.id;

    // ... スタッフ作成など
  });

  afterAll(async () => {
    // テストデータクリーンアップ
    await supabase.from('sessions').delete().eq('salon_id', testSalonId);
    await supabase.from('staffs').delete().eq('salon_id', testSalonId);
    await supabase.from('salons').delete().eq('id', testSalonId);
  });

  describe('セッション作成', () => {
    it('正常にセッションが作成される', async () => {
      const { data, error } = await supabase.functions.invoke('create-session', {
        body: {
          stylistId: testStaffId,
          customerInfo: { ageGroup: '30s' },
        },
      });

      expect(error).toBeNull();
      expect(data.data.sessionId).toBeDefined();
      expect(data.data.status).toBe('recording');
    });

    it('アクティブセッションがある場合はエラー', async () => {
      // 先にセッション作成
      await supabase.functions.invoke('create-session', {
        body: { stylistId: testStaffId },
      });

      // 2つ目のセッション作成を試行
      const { data, error } = await supabase.functions.invoke('create-session', {
        body: { stylistId: testStaffId },
      });

      expect(error).toBeDefined();
      expect(data.error.code).toBe('SES_004');
    });
  });
});
```

### 11.3 E2Eテスト仕様

```typescript
// e2e/sessionWorkflow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('セッションワークフロー E2E', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/home');
  });

  test('セッション開始から終了までの流れ', async ({ page }) => {
    // セッション開始
    await page.click('[data-testid="start-session-button"]');
    
    // お客様情報入力モーダル
    await expect(page.locator('[data-testid="session-modal"]')).toBeVisible();
    await page.selectOption('[data-testid="age-group-select"]', '30s');
    await page.click('[data-testid="modal-start-button"]');

    // セッション画面に遷移
    await expect(page).toHaveURL(/\/session\/.+/);
    await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();

    // 経過時間が更新される
    await expect(page.locator('[data-testid="elapsed-time"]')).toHaveText('00:01', {
      timeout: 5000,
    });

    // セッション終了
    await page.click('[data-testid="end-session-button"]');
    await page.click('[data-testid="confirm-end-button"]');

    // レポート画面に遷移
    await expect(page).toHaveURL(/\/report\/.+/);
    await expect(page.locator('[data-testid="overall-score"]')).toBeVisible();
  });
});
```

---

## 12. 付録

### 12.1 コーディング規約

#### 12.1.1 TypeScript

- **命名規則**
  - 変数・関数: camelCase
  - 型・インターフェース・クラス: PascalCase
  - 定数: UPPER_SNAKE_CASE
  - ファイル名: kebab-case（コンポーネントはPascalCase）

- **インポート順序**
  1. React / React Native
  2. 外部ライブラリ
  3. 内部モジュール（絶対パス）
  4. 相対パスインポート
  5. 型インポート

#### 12.1.2 SQL

- **命名規則**
  - テーブル名: snake_case（複数形）
  - カラム名: snake_case
  - インデックス名: idx_{table}_{columns}
  - 制約名: {table}_{constraint_type}_{description}

### 12.2 環境変数一覧

| 変数名 | 説明 | 必須 | 例 |
|--------|------|------|-----|
| SUPABASE_URL | Supabase プロジェクトURL | ○ | https://xxx.supabase.co |
| SUPABASE_ANON_KEY | Supabase 匿名キー | ○ | eyJ... |
| SUPABASE_SERVICE_ROLE_KEY | Supabase サービスロールキー | ○ | eyJ... |
| ANTHROPIC_API_KEY | Claude API キー | ○ | sk-ant-... |
| OPENAI_API_KEY | OpenAI API キー | ○ | sk-... |
| PYANNOTE_SERVER_URL | pyannote サーバーURL | ○ | http://... |
| PYANNOTE_API_KEY | pyannote API キー | ○ | ... |
| PYANNOTE_CALLBACK_SECRET | Callback認証シークレット | ○ | ... |

### 12.3 依存ライブラリ一覧

#### フロントエンド（React Native / Next.js）

| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| react | 18.x | UIフレームワーク |
| react-native | 0.73.x | モバイルアプリ |
| expo | ~50.x | React Native開発環境 |
| next | 14.x | Webフレームワーク |
| @supabase/supabase-js | 2.x | Supabaseクライアント |
| zustand | 4.x | 状態管理 |
| swr | 2.x | データフェッチング |
| zod | 3.x | バリデーション |
| recharts | 2.x | グラフ描画 |

#### バックエンド（Edge Functions）

| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| @anthropic-ai/sdk | 0.x | Claude API |
| deno std | 0.177+ | Deno標準ライブラリ |

---

## 変更履歴

| バージョン | 日付 | 変更者 | 変更内容 |
|-----------|------|--------|---------|
| 1.0 | 2025-12-04 | Revol Corporation | 初版作成 |

---

## 承認

| 役職 | 氏名 | 日付 | 署名 |
|------|------|------|------|
| プロジェクトマネージャー | | | |
| テックリード | | | |
| 品質保証責任者 | | | |

---

**文書終了**
