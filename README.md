# SalonTalk AI デプロイガイド

> **このドキュメントについて**
>
> 初心者でも迷わないよう、一挙手一投足を全てステップバイステップで説明しています。
> 上から順番に進めてください。スキップすると後でエラーになる可能性があります。

---

## 目次

1. [事前準備](#1-事前準備)
2. [ローカル開発・テスト環境](#2-ローカル開発テスト環境)
3. [Supabase のセットアップ](#3-supabase-のセットアップ)
4. [pyannote 話者分離サーバーのデプロイ](#4-pyannote-話者分離サーバーのデプロイ)
5. [Next.js Web ダッシュボードのデプロイ（Vercel）](#5-nextjs-web-ダッシュボードのデプロイvercel)
6. [React Native iPad アプリのデプロイ（Expo EAS）](#6-react-native-ipad-アプリのデプロイexpo-eas)
7. [GitHub Actions CI/CD の設定](#7-github-actions-cicd-の設定)
8. [本番環境の確認](#8-本番環境の確認)
9. [トラブルシューティング](#9-トラブルシューティング)
10. [声紋識別機能](#10-声紋識別機能)

---

## 1. 事前準備

### 1.1 必要なアカウントを作成する

以下のサービスのアカウントが必要です。全て無料で始められます。

| サービス | URL | 用途 |
|---------|-----|------|
| **Supabase** | https://supabase.com | データベース・認証・Edge Functions |
| **Vercel** | https://vercel.com | Web ダッシュボードのホスティング |
| **Expo** | https://expo.dev | iPad アプリのビルド・配信 |
| **Anthropic** | https://console.anthropic.com | Claude AI API |
| **OpenAI** | https://platform.openai.com | 埋め込みベクトル生成 |
| **Hugging Face** | https://huggingface.co | pyannote モデルのダウンロード |
| **VAST.ai または RunPod** | https://vast.ai または https://runpod.io | GPU サーバー（話者分離用） |

#### 1.1.1 Supabase アカウント作成

1. https://supabase.com にアクセス
2. 右上の「Start your project」をクリック
3. 「Continue with GitHub」をクリック（GitHub アカウントでログイン推奨）
4. GitHub の認証画面で「Authorize Supabase」をクリック

#### 1.1.2 Vercel アカウント作成

1. https://vercel.com にアクセス
2. 右上の「Sign Up」をクリック
3. 「Continue with GitHub」を選択
4. GitHub の認証画面で「Authorize Vercel」をクリック

#### 1.1.3 Expo アカウント作成

1. https://expo.dev にアクセス
2. 右上の「Sign Up」をクリック
3. メールアドレス、ユーザー名、パスワードを入力
4. 「Create Account」をクリック
5. メールに届いた確認リンクをクリック

#### 1.1.4 Anthropic アカウント作成

1. https://console.anthropic.com にアクセス
2. 「Sign Up」をクリック
3. メールアドレスを入力して「Continue」
4. メールに届いた確認コードを入力
5. 必要情報を入力してアカウント作成

#### 1.1.5 OpenAI アカウント作成

1. https://platform.openai.com にアクセス
2. 「Sign up」をクリック
3. メールアドレスで登録、または Google/Microsoft アカウントでログイン
4. 電話番号認証を完了

#### 1.1.6 Hugging Face アカウント作成

1. https://huggingface.co にアクセス
2. 右上の「Sign Up」をクリック
3. メールアドレス、ユーザー名、パスワードを入力
4. 「Sign Up」をクリック
5. メールに届いた確認リンクをクリック

---

### 1.2 ローカル開発環境の準備

#### 1.2.1 Node.js のインストール

1. https://nodejs.org にアクセス
2. 「LTS」（推奨版）をダウンロード（現在は v20.x 系）
3. ダウンロードしたインストーラーを実行
4. インストールウィザードに従って「Next」をクリックして進める
5. インストール完了後、ターミナル（Windows は PowerShell、Mac は Terminal）を開く
6. 以下のコマンドでインストール確認：

```bash
node --version
```

以下のように表示されれば OK：
```
v20.x.x
```

#### 1.2.2 pnpm のインストール

pnpm は npm より高速なパッケージマネージャーです。

**Mac/Linux の場合：**
```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

**Windows の場合：**
```powershell
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

インストール後、ターミナルを**再起動**してから確認：
```bash
pnpm --version
```

以下のように表示されれば OK：
```
9.x.x
```

#### 1.2.3 Git のインストール

**Mac の場合：**
```bash
xcode-select --install
```
ポップアップが表示されたら「インストール」をクリック

**Windows の場合：**
1. https://git-scm.com/download/win にアクセス
2. インストーラーをダウンロードして実行
3. 全てデフォルト設定で「Next」を押して進める

確認：
```bash
git --version
```

#### 1.2.4 Supabase CLI のインストール

**Mac の場合：**
```bash
brew install supabase/tap/supabase
```

> Homebrew がない場合は先に https://brew.sh でインストール

**Windows の場合：**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

> Scoop がない場合は先に https://scoop.sh でインストール

**Linux の場合：**
```bash
curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh
```

確認：
```bash
supabase --version
```

#### 1.2.5 Vercel CLI のインストール

```bash
pnpm add -g vercel
```

確認：
```bash
vercel --version
```

#### 1.2.6 Expo CLI (EAS) のインストール

```bash
pnpm add -g eas-cli
```

確認：
```bash
eas --version
```

---

### 1.3 プロジェクトのクローンと依存関係インストール

#### 1.3.1 リポジトリをクローン

```bash
# 作業ディレクトリに移動（例：ホームディレクトリ）
cd ~

# リポジトリをクローン
git clone https://github.com/DaisukeHori/SalonTalk-AI.git

# プロジェクトディレクトリに移動
cd SalonTalk-AI
```

#### 1.3.2 依存関係をインストール

```bash
pnpm install
```

このコマンドは数分かかります。以下のようなメッセージが表示されれば成功：
```
 WARN  deprecated package@version ...
Packages: +1234
++++++++++++++++++++++++++++++++++++++++++++
Done in 1m 23s
```

> **注意**: `WARN deprecated` は警告であり、エラーではありません。

---

### 1.4 API キーの取得

#### 1.4.1 Anthropic API キーの取得

1. https://console.anthropic.com にログイン
2. 左メニューの「API Keys」をクリック
3. 「Create Key」をクリック
4. 名前を入力（例：`salontalk-production`）
5. 「Create Key」をクリック
6. 表示されたキー（`sk-ant-api...`で始まる）をコピー
7. **このキーは一度しか表示されないので、必ずメモ帳などに保存**

#### 1.4.2 OpenAI API キーの取得

1. https://platform.openai.com/api-keys にログイン
2. 「Create new secret key」をクリック
3. 名前を入力（例：`salontalk-production`）
4. 「Create secret key」をクリック
5. 表示されたキー（`sk-...`で始まる）をコピー
6. **このキーは一度しか表示されないので、必ずメモ帳などに保存**

#### 1.4.3 Hugging Face トークンの取得

pyannote モデルのダウンロードに必要です。

1. https://huggingface.co/settings/tokens にログイン
2. 「New token」をクリック
3. 名前を入力（例：`salontalk-pyannote`）
4. 「Role」は「read」を選択
5. 「Generate a token」をクリック
6. 表示されたトークン（`hf_...`で始まる）をコピー

**重要: pyannote モデルの利用規約に同意**

1. https://huggingface.co/pyannote/speaker-diarization-3.1 にアクセス
2. 「Access repository」をクリック
3. 利用規約を読んで「Agree」をクリック

同様に以下のモデルにも同意：
- https://huggingface.co/pyannote/segmentation-3.0

---

## 2. ローカル開発・テスト環境

本番デプロイの前に、ローカル環境でアプリをテストできます。

### 2.1 テスト方法の選択

| 方法 | 必要なもの | 音声機能 | おすすめ度 | 用途 |
|------|-----------|---------|-----------|------|
| **ブラウザ（Expo Web）** | なし | 部分的 | ★★★ | UI確認 |
| **iOS シミュレーター** | Mac + Xcode | 制限あり | ★★★★ | iPad画面確認 |
| **Expo Go（実機）** | iPhone/iPad | フル対応 | ★★★★★ | 本格テスト |
| **Android エミュレーター** | Android Studio | 部分的 | ★★★ | Android確認 |

---

### 2.2 ブラウザでテスト（Expo Web）- 最も手軽

PC だけでアプリの UI を確認できます。実機がなくても開発を進められます。

#### 2.2.1 Web 用依存関係のインストール

```bash
# プロジェクトディレクトリに移動
cd ~/SalonTalk-AI

# 依存関係をインストール
pnpm install

# Mobile アプリディレクトリに移動
cd apps/mobile

# Web 用の依存関係を追加
pnpm add react-dom react-native-web @expo/metro-runtime
```

#### 2.2.2 開発サーバーを起動

```bash
# apps/mobile ディレクトリで実行
pnpm dev --web
```

以下のようなメッセージが表示されます：
```
› Web is waiting on http://localhost:8081
```

#### 2.2.3 ブラウザで確認

1. ブラウザが自動で開きます（開かない場合は http://localhost:8081 にアクセス）
2. アプリの画面が表示されます

#### 2.2.4 ブラウザテストの制限事項

| 機能 | 動作 | 備考 |
|------|------|------|
| UI 表示 | ○ | 完全動作 |
| ナビゲーション | ○ | 完全動作 |
| Supabase 認証 | ○ | 完全動作 |
| マイク（音声録音） | △ | ブラウザの許可が必要 |
| 音声認識 | △ | Web Speech API で代替（要追加実装） |
| ファイル保存 | △ | 一部制限あり |
| プッシュ通知 | × | 動作しない |

> **ヒント**: UI の確認やログイン機能のテストには十分使えます。

---

### 2.3 iOS シミュレーターでテスト（Mac のみ）

Mac をお持ちの場合、iPad と同じ画面サイズでテストできます。

#### 2.3.1 Xcode のインストール

1. **App Store を開く**
   - Mac の Launchpad または Spotlight（`Cmd + Space`）で「App Store」を検索

2. **Xcode を検索してインストール**
   - 「Xcode」で検索
   - 「入手」をクリック（約 12GB、30分〜1時間かかります）

3. **Xcode を起動して初期設定**
   - 初回起動時にコンポーネントのインストールを求められるので「Install」をクリック
   - Apple ID でのログインを求められたらログイン

4. **Command Line Tools をインストール**
   ```bash
   xcode-select --install
   ```
   ポップアップが表示されたら「インストール」をクリック

#### 2.3.2 シミュレーターで起動

```bash
# apps/mobile ディレクトリに移動
cd ~/SalonTalk-AI/apps/mobile

# iOS シミュレーターで起動
pnpm ios
```

初回は以下の質問が表示されます：
- **Which simulator would you like to use?** → iPad を選択（矢印キーで移動、Enter で選択）

シミュレーターが起動し、アプリがインストールされます（初回は数分かかります）。

#### 2.3.3 特定の iPad モデルを指定

```bash
# iPad Pro 12.9 インチを指定
npx expo run:ios --device "iPad Pro (12.9-inch) (6th generation)"

# 利用可能なデバイス一覧を確認
xcrun simctl list devices
```

#### 2.3.4 シミュレーターの操作方法

| 操作 | キーボードショートカット |
|------|------------------------|
| ホームに戻る | `Cmd + Shift + H` |
| 回転 | `Cmd + ←` または `Cmd + →` |
| スクリーンショット | `Cmd + S` |
| シミュレーター終了 | `Cmd + Q` |

#### 2.3.5 シミュレーターの制限事項

| 機能 | 動作 | 備考 |
|------|------|------|
| UI 表示 | ○ | 完全動作 |
| ナビゲーション | ○ | 完全動作 |
| Supabase 認証 | ○ | 完全動作 |
| マイク（音声録音） | △ | Mac のマイクを使用 |
| 音声認識 | △ | 制限あり |
| カメラ | × | 使用不可 |

---

### 2.4 Expo Go で実機テスト（iPhone/iPad）- 最もおすすめ

実際の iPhone/iPad でテストできます。音声機能も含めて完全にテストできます。

#### 2.4.1 Expo Go アプリをインストール

1. iPhone/iPad で **App Store** を開く
2. 「**Expo Go**」で検索
3. 「入手」をタップしてインストール

#### 2.4.2 開発サーバーを起動

PC のターミナルで：

```bash
cd ~/SalonTalk-AI/apps/mobile

# 開発サーバーを起動
pnpm dev
```

以下のような表示が出ます：
```
› Metro waiting on exp://192.168.1.100:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

█████████████████████████
█████████████████████████
████ ▄▄▄▄▄ █ ▀▀ █ ▄▄▄▄▄ ████
████ █   █ █▀ ▄ █ █   █ ████
...
```

#### 2.4.3 QR コードをスキャン

**iPhone/iPad で：**

1. **カメラアプリ**を開く
2. PC 画面の **QR コード**にカメラを向ける
3. 「Expo Go で開く」という通知が表示される
4. タップして Expo Go アプリで開く

#### 2.4.4 接続できない場合

**同じ Wi-Fi に接続しているか確認：**
- PC と iPhone/iPad が同じ Wi-Fi ネットワークに接続されている必要があります

**トンネルモードを使用：**
```bash
# トンネルモードで起動（異なるネットワークでも接続可能）
pnpm dev --tunnel
```

> トンネルモードは初回起動時に `@expo/ngrok` のインストールを求められます。`Y` を入力してインストール。

**ファイアウォールを確認：**
- PC のファイアウォールがポート 8081 をブロックしていないか確認

#### 2.4.5 Expo Go の制限事項

Expo Go では一部のネイティブモジュールが動作しません：

| 機能 | 動作 | 備考 |
|------|------|------|
| UI 表示 | ○ | 完全動作 |
| マイク | ○ | 完全動作 |
| 音声認識 | ○ | 完全動作 |
| プッシュ通知 | △ | Expo Push のみ |
| カスタムネイティブモジュール | × | Development Build が必要 |

---

### 2.5 Android エミュレーターでテスト

Android Studio を使用して Android でもテストできます。

#### 2.5.1 Android Studio のインストール

1. https://developer.android.com/studio にアクセス
2. 「Download Android Studio」をクリック
3. ダウンロードしたファイルを実行してインストール
4. 初回起動時のセットアップウィザードに従う（「Standard」を選択）

#### 2.5.2 エミュレーターの作成

1. Android Studio を起動
2. 「More Actions」→「Virtual Device Manager」
3. 「Create Virtual Device」をクリック
4. 「Tablet」→「Pixel Tablet」を選択→「Next」
5. システムイメージを選択（推奨: 最新の API レベル）→「Next」
6. 「Finish」をクリック

#### 2.5.3 エミュレーターで起動

```bash
cd ~/SalonTalk-AI/apps/mobile

# Android エミュレーターで起動
pnpm android
```

---

### 2.6 Web ダッシュボードのローカルテスト

Next.js の Web ダッシュボードもローカルでテストできます。

#### 2.6.1 環境変数の設定

```bash
cd ~/SalonTalk-AI/apps/web

# .env.local ファイルを作成
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
EOF
```

> 上記の値は Supabase ダッシュボードから取得してください（セクション3.2参照）

#### 2.6.2 開発サーバーを起動

```bash
cd ~/SalonTalk-AI/apps/web

# 開発サーバーを起動
pnpm dev
```

#### 2.6.3 ブラウザで確認

http://localhost:3000 にアクセス

---

### 2.7 ローカル開発のヒント

#### 2.7.1 ホットリロード

コードを変更すると自動的にアプリが更新されます。保存するだけで OK。

#### 2.7.2 開発者ツール

**Expo（Mobile）：**
- シェイクジェスチャー（実機）または `Cmd + D`（シミュレーター）で開発メニュー表示
- 「Debug Remote JS」でブラウザのデベロッパーツールを使用可能

**Next.js（Web）：**
- ブラウザのデベロッパーツール（`F12` または `Cmd + Option + I`）

#### 2.7.3 複数アプリの同時起動

ターミナルを複数開いて、Mobile と Web を同時に起動できます：

**ターミナル 1（Mobile）：**
```bash
cd ~/SalonTalk-AI/apps/mobile && pnpm dev
```

**ターミナル 2（Web）：**
```bash
cd ~/SalonTalk-AI/apps/web && pnpm dev
```

#### 2.7.4 Supabase ローカル開発（オプション）

本番の Supabase を使わず、ローカルで Supabase を動かすこともできます：

```bash
cd ~/SalonTalk-AI

# Docker が必要です
supabase start
```

ローカル Supabase が起動し、以下の URL で利用可能になります：
- API URL: http://localhost:54321
- Studio: http://localhost:54323

---

## 3. Supabase のセットアップ

### 3.1 新規プロジェクトの作成

1. https://supabase.com/dashboard にログイン
2. 「New Project」をクリック
3. 以下を入力：
   - **Name**: `salontalk-ai`
   - **Database Password**: 強力なパスワードを生成（「Generate a password」をクリック）
   - **Region**: `Northeast Asia (Tokyo)` を選択
   - **Pricing Plan**: 開発中は「Free」でOK
4. **Database Password は必ずメモ帳に保存**（後で必要）
5. 「Create new project」をクリック
6. プロジェクト作成には約2分かかります

### 3.2 プロジェクト情報の取得

プロジェクトが作成されたら、以下の情報を取得します。

#### 3.2.1 Project URL と API Keys

1. 左メニューの「Project Settings」（歯車アイコン）をクリック
2. 「API」をクリック
3. 以下をメモ帳にコピー：

| 項目 | 説明 | 例 |
|------|------|-----|
| **Project URL** | `SUPABASE_URL` として使用 | `https://abc123xyz.supabase.co` |
| **anon public** | `SUPABASE_ANON_KEY` として使用 | `eyJhbGciOiJIUzI1NiIs...` |
| **service_role secret** | `SUPABASE_SERVICE_ROLE_KEY` として使用 | `eyJhbGciOiJIUzI1NiIs...` |

> **警告**: `service_role` キーは絶対に公開しないでください！

#### 3.2.2 Project Reference ID

1. 「Project Settings」→「General」
2. 「Reference ID」をメモ（例：`abc123xyz`）

### 3.3 データベースマイグレーションの実行

#### 3.3.1 Supabase CLI でログイン

```bash
supabase login
```

ブラウザが開くので「Authorize」をクリック

#### 3.3.2 プロジェクトをリンク

```bash
# プロジェクトディレクトリにいることを確認
cd ~/SalonTalk-AI

# プロジェクトをリンク（Reference ID を使用）
supabase link --project-ref YOUR_PROJECT_REF
```

`YOUR_PROJECT_REF` は先ほどメモした Reference ID に置き換えてください。

例：
```bash
supabase link --project-ref abc123xyz
```

Database Password を聞かれたら、プロジェクト作成時にメモしたパスワードを入力

#### 3.3.3 マイグレーションを実行

```bash
supabase db push
```

以下のような出力が表示されれば成功：
```
Applying migration 00000000000000_initial_schema.sql...
Applying migration 20251205000001_add_setup_wizard.sql...
Finished supabase db push.
```

### 3.4 Edge Functions のデプロイ

#### 3.4.1 環境変数の設定

Edge Functions で使用する環境変数を Supabase に設定します。

1. https://supabase.com/dashboard にログイン
2. プロジェクトを選択
3. 左メニューの「Edge Functions」をクリック
4. 右上の「Manage secrets」をクリック
5. 以下の環境変数を1つずつ追加（「Add new secret」をクリック）：

| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-api...`（Anthropic API キー） |
| `OPENAI_API_KEY` | `sk-...`（OpenAI API キー） |
| `PYANNOTE_SERVER_URL` | `https://your-pyannote-server.com`（後で設定） |
| `PYANNOTE_API_KEY` | 任意の文字列（自分で決める） |
| `PYANNOTE_CALLBACK_SECRET` | 任意の文字列（自分で決める。32文字以上推奨） |

> **PYANNOTE_SERVER_URL は後で設定します**（セクション4で pyannote サーバーをデプロイ後）

#### 3.4.2 Edge Functions をデプロイ

すべての Edge Functions を一括デプロイします：

```bash
# プロジェクトディレクトリにいることを確認
cd ~/SalonTalk-AI

# 全ての Edge Functions をデプロイ
supabase functions deploy
```

以下のような出力が表示されれば成功：
```
Deploying function: analyze-conversation
Deploying function: analyze-segment
Deploying function: complete-salon-setup
...（省略）...
Deployed Edge Functions successfully!
```

個別にデプロイしたい場合：
```bash
supabase functions deploy create-session
supabase functions deploy end-session
supabase functions deploy analyze-conversation
# ... 以下同様
```

### 3.5 認証設定

#### 3.5.1 メール認証の設定

1. Supabase ダッシュボードで「Authentication」→「Providers」
2. 「Email」が有効になっていることを確認
3. 「Confirm email」を有効にする（メール確認を必須にする場合）

#### 3.5.2 リダイレクト URL の設定

1. 「Authentication」→「URL Configuration」
2. 「Site URL」に本番の URL を設定（後で設定）：
   - 例：`https://salontalk-ai.vercel.app`
3. 「Redirect URLs」に以下を追加：
   - `http://localhost:3000/**`（開発用）
   - `https://salontalk-ai.vercel.app/**`（本番用、後で設定）
   - `exp://localhost:8081/**`（Expo 開発用）

---

## 4. pyannote 話者分離サーバーのデプロイ

pyannote は GPU が必要なため、クラウド GPU サービス（VAST.ai または RunPod）を使用します。

### 4.1 VAST.ai を使用する場合

#### 4.1.1 VAST.ai アカウント作成と入金

1. https://vast.ai にアクセス
2. 「Sign Up」でアカウント作成
3. 「Billing」→「Add Credit」で最低 $10 入金（クレジットカード）

#### 4.1.2 インスタンスの検索

1. 「Search」タブをクリック
2. 以下の条件でフィルター：
   - **GPU**: RTX 3090 以上推奨（VRAM 24GB 以上）
   - **Disk Space**: 50GB 以上
   - **Internet Speed**: 100 Mbps 以上
3. 「$/hr」列で価格を確認（$0.3〜$0.8/時間が目安）
4. 適切なインスタンスの「RENT」をクリック

#### 4.1.3 Docker イメージの設定

1. 「Edit Image & Config」をクリック
2. 以下を設定：
   - **Docker Image**: `python:3.11-slim`
   - **Docker Options**: `-p 8000:8000`
   - **Disk Space to Allocate**: `50 GB`
   - **On-start Script**: 空のまま
3. 「RENT」をクリック

#### 4.1.4 インスタンスに接続

1. 「Instances」タブでインスタンスが「Running」になるまで待つ
2. インスタンスの「Connect」をクリック
3. SSH コマンドをコピー（例：`ssh -p 12345 root@xxx.xxx.xxx.xxx`）

ローカルターミナルで：
```bash
# SSH 接続（表示されたコマンドを使用）
ssh -p 12345 root@xxx.xxx.xxx.xxx
```

パスワードを聞かれたら、VAST.ai の画面に表示されているパスワードを入力

#### 4.1.5 pyannote サーバーをセットアップ

SSH 接続後、以下のコマンドを順番に実行：

```bash
# 1. システムパッケージのインストール
apt-get update && apt-get install -y ffmpeg libsndfile1 git

# 2. プロジェクトをクローン
git clone https://github.com/DaisukeHori/SalonTalk-AI.git
cd SalonTalk-AI/services/pyannote

# 3. Python 仮想環境の作成
python -m venv venv
source venv/bin/activate

# 4. 依存関係のインストール（10〜15分かかります）
pip install --upgrade pip
pip install -r requirements.txt

# 5. 環境変数の設定
cat > .env << 'EOF'
HUGGINGFACE_TOKEN=hf_your_token_here
PYANNOTE_API_KEY=your_api_key_here
CALLBACK_SECRET=your_callback_secret_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
EOF

# 上記の値を実際の値に置き換えてください！
nano .env  # エディタで編集

# 6. サーバーを起動
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

> **注意**: `nano .env` でファイルを開いたら：
> - 矢印キーで移動
> - 値を実際のものに置き換え
> - `Ctrl+O` で保存、`Enter` で確認
> - `Ctrl+X` で終了

#### 4.1.6 バックグラウンド実行の設定

サーバーを永続化するため、screen または tmux を使用：

```bash
# screen をインストール
apt-get install -y screen

# 新しい screen セッションを作成
screen -S pyannote

# サーバーを起動
cd ~/SalonTalk-AI/services/pyannote
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000

# screen をデタッチ（Ctrl+A, D を順に押す）
```

> screen セッションに戻るには：`screen -r pyannote`

#### 4.1.7 サーバー URL の確認

VAST.ai ダッシュボードで：
1. インスタンスの「Public IP」をメモ
2. ポート番号は `8000`
3. サーバー URL は `http://PUBLIC_IP:8000`

例：`http://123.45.67.89:8000`

**動作確認：**
```bash
curl http://123.45.67.89:8000/health
```

以下が返れば成功：
```json
{"status": "healthy"}
```

---

### 4.2 RunPod を使用する場合（代替）

#### 4.2.1 RunPod アカウント作成

1. https://runpod.io にアクセス
2. 「Sign Up」でアカウント作成
3. 「Billing」→「Add Credit」で最低 $10 入金

#### 4.2.2 Pod の作成

1. 「Pods」→「Deploy」をクリック
2. GPU を選択（RTX 3090 以上推奨）
3. 「Container Image」に `python:3.11-slim` を入力
4. 「Expose HTTP Ports」に `8000` を入力
5. 「Deploy On-Demand」をクリック

#### 4.2.3 セットアップ

1. Pod が「Running」になったら「Connect」をクリック
2. 「Start Web Terminal」をクリック
3. VAST.ai と同じセットアップコマンドを実行

---

### 4.3 クラウド GPU + Cloudflare Tunnel で公開する（推奨）

VAST.ai や RunPod の GPU サーバーを Cloudflare Tunnel で安全に公開する方法です。
IP アドレスを直接公開せず、HTTPS で保護された固定 URL を取得できます。

#### 4.3.1 なぜ Cloudflare Tunnel を使うのか

| 項目 | 直接 IP 公開 | Cloudflare Tunnel |
|------|-------------|-------------------|
| **セキュリティ** | IP が露出 | IP を隠蔽 |
| **HTTPS** | 手動設定必要 | 自動 |
| **DDoS 保護** | なし | あり |
| **固定 URL** | IP 変更で変わる | 固定 |
| **設定** | ポート開放必要 | 不要 |

#### 4.3.2 VAST.ai/RunPod に SSH 接続

まず、GPU サーバーに SSH 接続します。

**VAST.ai の場合：**
```bash
# VAST.ai ダッシュボードで「Connect」をクリックして表示されるコマンド
ssh -p 12345 root@xxx.xxx.xxx.xxx
```

**RunPod の場合：**
```bash
# RunPod ダッシュボードで「Connect」→「SSH over exposed TCP」
ssh root@xxx.xxx.xxx.xxx -p 12345 -i ~/.ssh/id_ed25519
```

#### 4.3.3 cloudflared をインストール（GPU サーバー上）

SSH 接続後、GPU サーバー上で以下を実行：

```bash
# cloudflared をダウンロード
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# インストール
dpkg -i cloudflared-linux-amd64.deb

# 確認
cloudflared --version
```

#### 4.3.4 Cloudflare にログイン（GPU サーバー上）

```bash
cloudflared tunnel login
```

以下のようなメッセージが表示されます：
```
Please open the following URL and log in with your Cloudflare account:

https://dash.cloudflare.com/argotunnel?aud=xxx...

Leave cloudflared running to download the cert automatically.
```

1. 表示された URL をコピー
2. **ローカル PC のブラウザ**でその URL を開く
3. Cloudflare にログイン
4. 「Authorize」をクリック
5. GPU サーバーのターミナルに「You have successfully logged in」と表示される

#### 4.3.5 方法 A: Quick Tunnel で公開（最も簡単）

すぐに公開したい場合はこの方法が最も簡単です。

```bash
# pyannote サーバーが起動していることを確認
# （別の screen セッションで起動している場合）

# Quick Tunnel で公開
cloudflared tunnel --url http://localhost:8000
```

以下のような出力が表示されます：
```
2024-xx-xx INF +-----------------------------------------------------------+
2024-xx-xx INF |  Your quick Tunnel has been created! Visit it at:         |
2024-xx-xx INF |  https://random-words-here.trycloudflare.com               |
2024-xx-xx INF +-----------------------------------------------------------+
```

この URL（`https://random-words-here.trycloudflare.com`）をメモしてください。

> **注意**: Quick Tunnel はサーバーを再起動すると URL が変わります。

#### 4.3.6 方法 B: 名前付きトンネル（固定 URL）

固定 URL が必要な場合：

**1. トンネルを作成**

```bash
cloudflared tunnel create pyannote-gpu
```

出力される Tunnel ID（`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）をメモ

**2. 設定ファイルを作成**

```bash
# 設定ディレクトリを作成
mkdir -p ~/.cloudflared

# 設定ファイルを作成
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: pyannote.yourdomain.com
    service: http://localhost:8000
  - service: http_status:404
EOF
```

`YOUR_TUNNEL_ID` と `yourdomain.com` を実際の値に置き換え

**3. DNS を設定**

```bash
cloudflared tunnel route dns pyannote-gpu pyannote.yourdomain.com
```

**4. トンネルを起動**

```bash
cloudflared tunnel run pyannote-gpu
```

#### 4.3.7 pyannote と Cloudflare Tunnel を同時に起動

screen を使って両方をバックグラウンドで実行します。

```bash
# 1. pyannote サーバー用の screen セッション
screen -S pyannote

# pyannote を起動
cd ~/SalonTalk-AI/services/pyannote
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Ctrl+A, D でデタッチ

# 2. Cloudflare Tunnel 用の screen セッション
screen -S tunnel

# Quick Tunnel の場合
cloudflared tunnel --url http://localhost:8000

# または名前付きトンネルの場合
# cloudflared tunnel run pyannote-gpu

# Ctrl+A, D でデタッチ
```

**セッションの確認：**
```bash
# 実行中の screen セッション一覧
screen -ls

# pyannote セッションに戻る
screen -r pyannote

# tunnel セッションに戻る
screen -r tunnel
```

#### 4.3.8 起動スクリプトを作成（便利）

毎回手動で起動するのは面倒なので、スクリプトを作成します：

```bash
cat > ~/start-pyannote.sh << 'EOF'
#!/bin/bash

# pyannote サーバーを起動
cd ~/SalonTalk-AI/services/pyannote
source venv/bin/activate

# バックグラウンドで pyannote を起動
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
PYANNOTE_PID=$!

# 起動を待つ
sleep 10

# Cloudflare Tunnel を起動（Quick Tunnel）
cloudflared tunnel --url http://localhost:8000

# 終了時に pyannote も停止
kill $PYANNOTE_PID
EOF

chmod +x ~/start-pyannote.sh
```

**使用方法：**
```bash
# screen セッションで起動
screen -S pyannote-tunnel
~/start-pyannote.sh

# Ctrl+A, D でデタッチ
```

#### 4.4.9 動作確認

ローカル PC から Cloudflare Tunnel の URL にアクセス：

```bash
curl https://random-words-here.trycloudflare.com/health
```

以下が返れば成功：
```json
{"status": "healthy"}
```

#### 4.3.10 Supabase に URL を設定

1. Supabase ダッシュボード→「Edge Functions」→「Manage secrets」
2. `PYANNOTE_SERVER_URL` を設定：
   - Quick Tunnel: `https://random-words-here.trycloudflare.com`
   - 名前付きトンネル: `https://pyannote.yourdomain.com`
3. 「Save」をクリック

#### 4.3.11 VAST.ai/RunPod 再起動時の注意

クラウド GPU サーバーを停止・再起動すると：

| 項目 | Quick Tunnel | 名前付きトンネル |
|------|-------------|-----------------|
| URL | **変わる** | 変わらない |
| 設定ファイル | 不要 | 必要（再作成） |
| Supabase 更新 | **必要** | 不要 |

**Quick Tunnel を使っている場合：**

再起動後、新しい URL を Supabase に設定し直す必要があります。

**名前付きトンネルを使っている場合：**

認証情報ファイルを再作成する必要があります：
```bash
# 再ログイン
cloudflared tunnel login

# トンネルを再起動
cloudflared tunnel run pyannote-gpu
```

#### 4.3.12 トラブルシューティング

**エラー: 「connection refused」**

```bash
# pyannote が起動しているか確認
curl http://localhost:8000/health

# 起動していなければ起動
cd ~/SalonTalk-AI/services/pyannote
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**エラー: 「tunnel not found」**

```bash
# トンネル一覧を確認
cloudflared tunnel list

# トンネルが存在しなければ再作成
cloudflared tunnel create pyannote-gpu
```

**URL にアクセスできない**

```bash
# cloudflared が動作しているか確認
ps aux | grep cloudflared

# ログを確認
cloudflared tunnel --url http://localhost:8000 --loglevel debug
```

---

### 4.4 ローカル GPU で実行する場合（自分の PC）

NVIDIA GPU 搭載の PC があれば、クラウドサービスを使わずにローカルで実行できます。

#### 4.4.1 必要なスペック

| 項目 | 最小要件 | 推奨 |
|------|---------|------|
| **GPU** | NVIDIA GTX 1080 (8GB VRAM) | RTX 3090 (24GB VRAM) |
| **RAM** | 16GB | 32GB |
| **ストレージ** | 20GB 空き | 50GB 空き |
| **OS** | Windows 10/11, Ubuntu 20.04+ | Ubuntu 22.04 |

> **注意**: AMD GPU や Intel GPU は対応していません。NVIDIA GPU が必須です。

#### 4.4.2 NVIDIA ドライバーのインストール

**Windows の場合：**

1. https://www.nvidia.com/drivers にアクセス
2. GPU モデルを選択してダウンロード
3. インストーラーを実行
4. 「NVIDIA グラフィックス ドライバー」を選択してインストール
5. PC を再起動

**Ubuntu/Linux の場合：**

```bash
# 推奨ドライバーを確認
ubuntu-drivers devices

# 推奨ドライバーをインストール
sudo ubuntu-drivers autoinstall

# 再起動
sudo reboot
```

**インストール確認：**

```bash
nvidia-smi
```

以下のような出力が表示されれば OK：
```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 535.154.05   Driver Version: 535.154.05   CUDA Version: 12.2     |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|===============================+======================+======================|
|   0  NVIDIA GeForce ...  Off  | 00000000:01:00.0 Off |                  N/A |
| 30%   35C    P8    10W / 350W |      0MiB / 24576MiB |      0%      Default |
+-------------------------------+----------------------+----------------------+
```

#### 4.4.3 CUDA Toolkit のインストール

**Windows の場合：**

1. https://developer.nvidia.com/cuda-downloads にアクセス
2. OS を選択（Windows → x86_64 → 11 → exe (local)）
3. ダウンロードしたインストーラーを実行
4. 「Express」を選択してインストール

**Ubuntu/Linux の場合：**

```bash
# CUDA リポジトリを追加
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt-get update

# CUDA Toolkit をインストール
sudo apt-get install -y cuda-toolkit-12-2

# 環境変数を設定
echo 'export PATH=/usr/local/cuda/bin:$PATH' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc
source ~/.bashrc
```

**インストール確認：**

```bash
nvcc --version
```

以下のような出力が表示されれば OK：
```
nvcc: NVIDIA (R) Cuda compiler driver
Copyright (c) 2005-2023 NVIDIA Corporation
Built on ...
Cuda compilation tools, release 12.2, V12.2.xxx
```

#### 4.4.4 Python 環境のセットアップ

**Windows の場合：**

1. https://www.python.org/downloads/ から Python 3.11 をダウンロード
2. インストール時に「Add Python to PATH」にチェック
3. インストール

**Ubuntu/Linux の場合：**

```bash
sudo apt-get install -y python3.11 python3.11-venv python3-pip
```

#### 4.4.5 pyannote サーバーのセットアップ

```bash
# プロジェクトディレクトリに移動
cd ~/SalonTalk-AI/services/pyannote

# Python 仮想環境を作成
python3.11 -m venv venv

# 仮想環境を有効化
# Windows の場合:
# venv\Scripts\activate
# Linux/Mac の場合:
source venv/bin/activate

# pip をアップグレード
pip install --upgrade pip

# PyTorch (GPU 版) をインストール
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121

# その他の依存関係をインストール
pip install -r requirements.txt
```

> **注意**: PyTorch のインストールには数分かかります。

#### 4.4.6 環境変数の設定

```bash
cd ~/SalonTalk-AI/services/pyannote

# .env ファイルを作成
cat > .env << 'EOF'
# Hugging Face トークン（pyannote モデルのダウンロードに必要）
HUGGINGFACE_TOKEN=hf_your_token_here

# API 認証キー（自分で決める）
PYANNOTE_API_KEY=your_api_key_here

# コールバック署名用シークレット（自分で決める、32文字以上推奨）
CALLBACK_SECRET=your_callback_secret_here

# Supabase 接続情報
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# サーバー設定
HOST=0.0.0.0
PORT=8000
EOF
```

**Windows の場合（PowerShell）：**

```powershell
# メモ帳で .env ファイルを作成
notepad .env
```

上記の内容をコピーして、実際の値に置き換えて保存

#### 4.4.7 GPU 認識の確認

```bash
# 仮想環境を有効化していることを確認
source venv/bin/activate  # Windows: venv\Scripts\activate

# Python で GPU を確認
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"None\"}')"
```

以下のように表示されれば OK：
```
CUDA available: True
GPU: NVIDIA GeForce RTX 3090
```

**「CUDA available: False」の場合：**
1. NVIDIA ドライバーが正しくインストールされているか確認（`nvidia-smi`）
2. CUDA Toolkit がインストールされているか確認（`nvcc --version`）
3. PyTorch を再インストール：
   ```bash
   pip uninstall torch torchaudio
   pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
   ```

#### 4.4.8 サーバーを起動

```bash
cd ~/SalonTalk-AI/services/pyannote
source venv/bin/activate  # Windows: venv\Scripts\activate

# サーバーを起動
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

以下のようなメッセージが表示されれば成功：
```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Loading pyannote model...
INFO:     Model loaded successfully!
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

> **注意**: 初回起動時は pyannote モデル（約 1GB）のダウンロードに数分かかります。

#### 4.4.9 動作確認

別のターミナルを開いて：

```bash
curl http://localhost:8000/health
```

以下が返れば成功：
```json
{"status": "healthy", "gpu": true, "model_loaded": true}
```

#### 4.4.10 バックグラウンド実行（Windows）

Windows でバックグラウンド実行するには、タスクスケジューラを使用：

1. 「タスク スケジューラ」を検索して開く
2. 「タスクの作成」をクリック
3. **全般タブ**：
   - 名前: `pyannote-server`
   - 「ユーザーがログオンしているかどうかにかかわらず実行する」を選択
4. **トリガータブ**：
   - 「新規」→「スタートアップ時」を選択
5. **操作タブ**：
   - 「新規」→ プログラム: `C:\path\to\venv\Scripts\python.exe`
   - 引数: `-m uvicorn app.main:app --host 0.0.0.0 --port 8000`
   - 開始: `C:\path\to\SalonTalk-AI\services\pyannote`
6. 「OK」をクリック

#### 4.4.11 バックグラウンド実行（Linux/Mac）

**systemd サービスとして登録（推奨）：**

```bash
# サービスファイルを作成
sudo cat > /etc/systemd/system/pyannote.service << 'EOF'
[Unit]
Description=Pyannote Speaker Diarization Server
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/SalonTalk-AI/services/pyannote
Environment="PATH=/home/YOUR_USERNAME/SalonTalk-AI/services/pyannote/venv/bin"
ExecStart=/home/YOUR_USERNAME/SalonTalk-AI/services/pyannote/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# YOUR_USERNAME を実際のユーザー名に置き換え
sudo sed -i "s/YOUR_USERNAME/$(whoami)/g" /etc/systemd/system/pyannote.service

# サービスを有効化して起動
sudo systemctl daemon-reload
sudo systemctl enable pyannote
sudo systemctl start pyannote

# 状態を確認
sudo systemctl status pyannote
```

**サービスの操作：**

```bash
# 停止
sudo systemctl stop pyannote

# 再起動
sudo systemctl restart pyannote

# ログを確認
sudo journalctl -u pyannote -f
```

#### 4.4.12 外部からアクセスできるようにする

ローカル PC の pyannote サーバーに外部（iPad アプリなど）からアクセスするには：

**方法 1: 同じ LAN 内からアクセス**

1. PC の IP アドレスを確認：
   ```bash
   # Windows
   ipconfig

   # Linux/Mac
   ip addr
   ```
2. `192.168.x.x:8000` のような URL でアクセス

**方法 2: ngrok でインターネット公開**

```bash
# ngrok をインストール（https://ngrok.com からダウンロード）

# トンネルを作成
ngrok http 8000
```

表示される URL（例：`https://abc123.ngrok.io`）を使用

**方法 3: Cloudflare Tunnel（無料・推奨）**

Cloudflare Tunnel は無料で、固定 URL を取得でき、HTTPS も自動で設定されます。

---

### 4.4.13 Cloudflare Tunnel で公開する（詳細手順）

Cloudflare Tunnel を使うと、ローカル PC の pyannote サーバーをインターネットに安全に公開できます。

#### ステップ 1: Cloudflare アカウントを作成

1. https://dash.cloudflare.com/sign-up にアクセス
2. メールアドレスとパスワードを入力
3. 「Create Account」をクリック
4. メールに届いた確認リンクをクリック

#### ステップ 2: cloudflared をインストール

**Windows の場合：**

1. https://github.com/cloudflare/cloudflared/releases にアクセス
2. 最新版の `cloudflared-windows-amd64.msi` をダウンロード
3. ダウンロードしたファイルをダブルクリックしてインストール
4. インストール完了後、PowerShell を**管理者として**開く
5. インストール確認：
   ```powershell
   cloudflared --version
   ```

**Mac の場合：**

```bash
# Homebrew でインストール
brew install cloudflare/cloudflare/cloudflared

# 確認
cloudflared --version
```

**Ubuntu/Linux の場合：**

```bash
# cloudflared をダウンロード
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# インストール
sudo dpkg -i cloudflared-linux-amd64.deb

# 確認
cloudflared --version
```

以下のように表示されれば OK：
```
cloudflared version 2024.x.x (built 2024-xx-xx)
```

#### ステップ 3: Cloudflare にログイン

```bash
cloudflared tunnel login
```

ブラウザが自動で開きます：

1. Cloudflare アカウントでログイン
2. 「Authorize」をクリック
3. ターミナルに「You have successfully logged in」と表示される

> **ブラウザが開かない場合**: ターミナルに表示された URL をコピーしてブラウザで開く

#### ステップ 4: トンネルを作成

```bash
# トンネルを作成（名前は自由に決められます）
cloudflared tunnel create pyannote-server
```

以下のような出力が表示されます：
```
Tunnel credentials written to /home/user/.cloudflared/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.json
Created tunnel pyannote-server with id xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**重要**: この `id`（`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）をメモしてください。

#### ステップ 5: ドメインを設定（無料サブドメイン）

Cloudflare の無料プランでは、自分のドメインを追加するか、Quick Tunnel を使用できます。

**方法 A: Quick Tunnel（最も簡単、一時的な URL）**

```bash
# 一時的な URL で公開（PC を再起動すると URL が変わります）
cloudflared tunnel --url http://localhost:8000
```

以下のような出力が表示されます：
```
2024-xx-xx INF Requesting new quick Tunnel on trycloudflare.com...
2024-xx-xx INF +-----------------------------------------------------------+
2024-xx-xx INF |  Your quick Tunnel has been created! Visit it at:         |
2024-xx-xx INF |  https://random-words-here.trycloudflare.com               |
2024-xx-xx INF +-----------------------------------------------------------+
```

この URL（`https://random-words-here.trycloudflare.com`）を使用します。

> **注意**: Quick Tunnel は PC を再起動すると URL が変わります。固定 URL が必要な場合は方法 B を使用。

**方法 B: 名前付きトンネル（固定 URL、推奨）**

自分のドメインを持っている場合、または固定 URL が必要な場合：

1. **Cloudflare にドメインを追加**（既にドメインを持っている場合）
   - https://dash.cloudflare.com にログイン
   - 「Add a Site」をクリック
   - ドメインを入力
   - Free プランを選択
   - DNS 設定を Cloudflare に変更

2. **設定ファイルを作成**

```bash
# 設定ディレクトリに移動
cd ~/.cloudflared

# 設定ファイルを作成
cat > config.yml << 'EOF'
tunnel: YOUR_TUNNEL_ID
credentials-file: /home/YOUR_USERNAME/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: pyannote.yourdomain.com
    service: http://localhost:8000
  - service: http_status:404
EOF
```

`YOUR_TUNNEL_ID` と `YOUR_USERNAME`、`yourdomain.com` を実際の値に置き換えてください。

3. **DNS レコードを作成**

```bash
cloudflared tunnel route dns pyannote-server pyannote.yourdomain.com
```

4. **トンネルを起動**

```bash
cloudflared tunnel run pyannote-server
```

#### ステップ 6: トンネルをサービスとして登録（自動起動）

PC 起動時に自動でトンネルが開始されるようにします。

**Windows の場合：**

```powershell
# 管理者として PowerShell を開く
cloudflared service install
```

これで Windows サービスとして登録されます。

**Ubuntu/Linux の場合：**

```bash
# サービスとしてインストール
sudo cloudflared service install

# サービスを有効化して起動
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

# 状態を確認
sudo systemctl status cloudflared
```

**Mac の場合：**

```bash
# LaunchAgent としてインストール
sudo cloudflared service install

# サービスを起動
sudo launchctl start com.cloudflare.cloudflared
```

#### ステップ 7: 動作確認

別の PC やスマートフォンから、Cloudflare Tunnel の URL にアクセスしてテスト：

```bash
# Quick Tunnel の場合
curl https://random-words-here.trycloudflare.com/health

# 名前付きトンネルの場合
curl https://pyannote.yourdomain.com/health
```

以下が返れば成功：
```json
{"status": "healthy", "gpu": true, "model_loaded": true}
```

#### ステップ 8: Supabase に URL を設定

1. Supabase ダッシュボード→「Edge Functions」→「Manage secrets」
2. `PYANNOTE_SERVER_URL` を編集
3. Cloudflare Tunnel の URL を入力：
   - Quick Tunnel: `https://random-words-here.trycloudflare.com`
   - 名前付きトンネル: `https://pyannote.yourdomain.com`
4. 「Save」をクリック

#### Cloudflare Tunnel のトラブルシューティング

**エラー: 「failed to connect to origin」**

原因: pyannote サーバーが起動していない

解決方法:
```bash
# pyannote サーバーが起動しているか確認
curl http://localhost:8000/health

# 起動していなければ起動
cd ~/SalonTalk-AI/services/pyannote
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**エラー: 「Tunnel credentials file not found」**

原因: ログインしていない、または認証情報が見つからない

解決方法:
```bash
cloudflared tunnel login
```

**Quick Tunnel の URL が毎回変わる**

これは仕様です。固定 URL が必要な場合は名前付きトンネルを使用してください。

#### Cloudflare Tunnel の管理

```bash
# トンネル一覧を表示
cloudflared tunnel list

# トンネルの情報を表示
cloudflared tunnel info pyannote-server

# トンネルを削除
cloudflared tunnel delete pyannote-server

# ログを確認（サービス実行時）
sudo journalctl -u cloudflared -f  # Linux
```

#### Cloudflare Tunnel のメリット

| 項目 | Cloudflare Tunnel | ngrok | ポート開放 |
|------|-------------------|-------|-----------|
| **料金** | 無料 | 無料（制限あり） | 無料 |
| **HTTPS** | 自動 | 自動 | 手動設定必要 |
| **固定 URL** | 可能 | 有料 | 可能 |
| **セキュリティ** | 高（DDoS 保護） | 中 | 低 |
| **速度** | 高速（CDN 経由） | 普通 | 普通 |
| **設定難易度** | 中 | 低 | 高 |

---

#### 4.4.14 ローカル GPU のメリット・デメリット

| 項目 | ローカル GPU | クラウド GPU (VAST.ai等) |
|------|-------------|------------------------|
| **コスト** | 初期費用のみ | 従量課金（$0.3-0.8/時間） |
| **セットアップ** | やや複雑 | シンプル |
| **パフォーマンス** | GPU スペック次第 | 高性能 GPU を選択可能 |
| **可用性** | PC 起動時のみ | 24時間稼働可能 |
| **ネットワーク** | 外部公開に設定必要 | 最初から外部公開 |
| **おすすめ** | 開発・テスト用 | 本番運用 |

---

### 4.5 pyannote サーバーとバックエンドの接続設定

pyannote サーバーを起動したら、Supabase の Edge Functions からアクセスできるように設定します。

#### 4.5.1 システム構成の理解

```
┌─────────────────┐      ┌─────────────────────┐      ┌─────────────────┐
│   iPad アプリ   │      │   Supabase          │      │  pyannote       │
│   (フロント)    │─────▶│   Edge Functions    │─────▶│  サーバー       │
│                 │      │   (バックエンド)    │      │  (GPU)          │
└─────────────────┘      └─────────────────────┘      └─────────────────┘
        │                         │                          │
        │ 1. 音声データ送信       │ 2. pyannote に転送       │
        │                         │                          │
        │                         │ 3. 話者分離結果を受信    │
        │                         │◀─────────────────────────│
        │ 4. 結果を返却           │                          │
        │◀────────────────────────│                          │
```

**データの流れ：**
1. iPad アプリが音声データを Supabase Edge Functions に送信
2. Edge Functions（`trigger-diarization`）が pyannote サーバーに音声を転送
3. pyannote が話者分離を実行し、結果をコールバック
4. Edge Functions（`diarization-callback`）が結果を受け取り、DB に保存

#### 4.5.2 必要な環境変数

pyannote との接続には、以下の環境変数を Supabase に設定する必要があります：

| 環境変数 | 説明 | 例 |
|---------|------|-----|
| `PYANNOTE_SERVER_URL` | pyannote サーバーの URL | `https://xxx.trycloudflare.com` |
| `PYANNOTE_API_KEY` | API 認証キー（自分で決める） | `my-secret-api-key-12345` |
| `PYANNOTE_CALLBACK_SECRET` | コールバック署名用シークレット | `callback-secret-67890` |

#### 4.5.3 Supabase Dashboard で環境変数を設定

**手順：**

1. **Supabase Dashboard にログイン**
   - https://supabase.com/dashboard にアクセス
   - プロジェクトを選択

2. **Edge Functions の設定を開く**
   - 左メニューの「Edge Functions」をクリック
   - 右上の「Manage secrets」をクリック

3. **環境変数を追加**

   「Add new secret」をクリックして、以下を1つずつ追加：

   **PYANNOTE_SERVER_URL:**
   ```
   Name: PYANNOTE_SERVER_URL
   Value: https://your-tunnel-url.trycloudflare.com
   ```

   **PYANNOTE_API_KEY:**
   ```
   Name: PYANNOTE_API_KEY
   Value: your-api-key-here
   ```
   > この値は pyannote サーバーの `.env` ファイルの `PYANNOTE_API_KEY` と同じ値にする

   **PYANNOTE_CALLBACK_SECRET:**
   ```
   Name: PYANNOTE_CALLBACK_SECRET
   Value: your-callback-secret-here
   ```
   > この値は pyannote サーバーの `.env` ファイルの `CALLBACK_SECRET` と同じ値にする

4. **保存**
   - 各項目を入力後「Save」をクリック

#### 4.5.4 pyannote サーバー側の設定確認

pyannote サーバーの `.env` ファイルが正しく設定されていることを確認：

```bash
# GPU サーバーに SSH 接続して確認
cat ~/SalonTalk-AI/services/pyannote/.env
```

以下の値が Supabase の環境変数と一致していることを確認：

```env
# この値が Supabase の PYANNOTE_API_KEY と一致
PYANNOTE_API_KEY=your-api-key-here

# この値が Supabase の PYANNOTE_CALLBACK_SECRET と一致
CALLBACK_SECRET=your-callback-secret-here

# Supabase の URL（コールバック送信先）
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

#### 4.5.5 URL の種類と設定例

pyannote サーバーの公開方法によって、設定する URL が異なります：

| 公開方法 | URL の形式 | 例 |
|---------|-----------|-----|
| **Cloudflare Quick Tunnel** | `https://xxx.trycloudflare.com` | `https://random-words.trycloudflare.com` |
| **Cloudflare 名前付きトンネル** | `https://your-subdomain.yourdomain.com` | `https://pyannote.example.com` |
| **ngrok** | `https://xxx.ngrok.io` | `https://abc123.ngrok.io` |
| **直接 IP（非推奨）** | `http://IP:PORT` | `http://123.45.67.89:8000` |

> **推奨**: Cloudflare Tunnel を使用（HTTPS 自動、セキュリティ高）

#### 4.5.6 接続テスト

設定が正しいか確認するため、Edge Function をテスト呼び出しします。

**方法 1: curl でテスト**

```bash
# Supabase の anon key を使用
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/trigger-diarization" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**方法 2: Supabase Dashboard でテスト**

1. 「Edge Functions」→「trigger-diarization」を選択
2. 「Logs」タブをクリック
3. iPad アプリから音声を送信してログを確認

**正常な場合のログ例：**
```
Sending audio to pyannote server: https://xxx.trycloudflare.com
Pyannote response: 200 OK
Diarization job started: job-id-12345
```

**エラーの場合のログ例：**
```
Error connecting to pyannote server: ECONNREFUSED
```
→ pyannote サーバーが起動していないか、URL が間違っている

#### 4.5.7 URL が変わった場合の更新手順

Quick Tunnel を使用している場合、サーバー再起動で URL が変わります。

**更新手順：**

1. **新しい URL を確認**
   ```bash
   # GPU サーバーで Cloudflare Tunnel を起動
   cloudflared tunnel --url http://localhost:8000

   # 表示された URL をメモ
   # https://new-random-words.trycloudflare.com
   ```

2. **Supabase の環境変数を更新**
   - Supabase Dashboard→「Edge Functions」→「Manage secrets」
   - `PYANNOTE_SERVER_URL` の値を新しい URL に変更
   - 「Save」をクリック

3. **動作確認**
   - iPad アプリで音声を録音してテスト
   - Edge Functions のログで接続成功を確認

#### 4.5.8 トラブルシューティング

**問題: 「Connection refused」エラー**

原因と解決方法：
1. pyannote サーバーが起動していない
   ```bash
   # GPU サーバーで確認
   curl http://localhost:8000/health
   ```
2. Cloudflare Tunnel が起動していない
   ```bash
   # トンネルを起動
   cloudflared tunnel --url http://localhost:8000
   ```

**問題: 「401 Unauthorized」エラー**

原因と解決方法：
- API キーが一致していない
- Supabase の `PYANNOTE_API_KEY` と pyannote サーバーの `PYANNOTE_API_KEY` が同じ値か確認

**問題: 「Callback failed」エラー**

原因と解決方法：
- pyannote サーバーが Supabase にコールバックを送信できない
- pyannote サーバーの `.env` で `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` が正しいか確認

**問題: URL を更新しても反映されない**

原因と解決方法：
- Edge Functions のキャッシュ
- 数分待つか、Edge Functions を再デプロイ：
  ```bash
  supabase functions deploy trigger-diarization
  supabase functions deploy diarization-callback
  ```

#### 4.5.9 本番運用のベストプラクティス

| 項目 | 推奨設定 |
|------|---------|
| **URL** | 名前付きトンネル（固定 URL） |
| **API キー** | 32文字以上のランダム文字列 |
| **監視** | Supabase Logs + pyannote ログを定期確認 |
| **バックアップ** | 環境変数をメモしておく |

**API キーの生成例：**
```bash
# ランダムな API キーを生成
openssl rand -hex 32
# 出力例: a1b2c3d4e5f6...（64文字）
```

---

## 5. Next.js Web ダッシュボードのデプロイ（Vercel）

### 5.1 Vercel にログイン

```bash
vercel login
```

ブラウザが開くので：
1. 「Continue with GitHub」をクリック
2. 認証を許可

### 5.2 プロジェクトをインポート

#### 5.2.1 GitHub リポジトリを Vercel に接続

1. https://vercel.com/dashboard にアクセス
2. 「Add New...」→「Project」をクリック
3. 「Import Git Repository」で `DaisukeHori/SalonTalk-AI` を選択
4. 「Import」をクリック

#### 5.2.2 プロジェクト設定

以下を設定：

| 設定項目 | 値 |
|---------|-----|
| **Project Name** | `salontalk-ai`（お好みで変更可） |
| **Framework Preset** | `Next.js`（自動検出） |
| **Root Directory** | `apps/web` をクリックして選択 |
| **Build Command** | `pnpm build`（デフォルトのまま） |
| **Output Directory** | `.next`（デフォルトのまま） |
| **Install Command** | `pnpm install`（デフォルトのまま） |

#### 5.2.3 環境変数の設定

「Environment Variables」セクションで以下を追加：

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://abc123xyz.supabase.co`（あなたの Supabase URL） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...`（あなたの anon key） |

> **注意**:
> - `NEXT_PUBLIC_` プレフィックスはクライアント側で使用するために必要
> - `service_role` キーはフロントエンドには設定しない（セキュリティ上の理由）

#### 5.2.4 デプロイを実行

1. 「Deploy」をクリック
2. ビルドが完了するまで待つ（約2〜3分）
3. 「Congratulations!」と表示されたらデプロイ完了

#### 5.2.5 デプロイ URL を確認

デプロイ完了後、URL が表示されます：
- 例：`https://salontalk-ai.vercel.app`

この URL をメモしてください。

### 5.3 Supabase のリダイレクト URL を更新

1. Supabase ダッシュボード→「Authentication」→「URL Configuration」
2. 「Site URL」を Vercel の URL に変更：
   - `https://salontalk-ai.vercel.app`
3. 「Redirect URLs」に追加：
   - `https://salontalk-ai.vercel.app/**`
4. 「Save」をクリック

### 5.4 カスタムドメインの設定（オプション）

独自ドメインを使用する場合：

1. Vercel ダッシュボードでプロジェクトを選択
2. 「Settings」→「Domains」
3. 「Add」をクリックしてドメインを入力
4. DNS 設定の指示に従う

---

## 6. React Native iPad アプリのデプロイ（Expo EAS）

### 6.1 Apple Developer Program への登録

**重要**: iOS アプリを配信するには Apple Developer Program（年間 $99）への登録が必要です。

1. https://developer.apple.com/programs/ にアクセス
2. 「Enroll」をクリック
3. Apple ID でログイン（なければ作成）
4. 必要情報を入力
5. 年会費 $99 を支払い
6. 審査承認まで 24〜48時間待つ

### 6.2 Expo プロジェクト ID の設定

#### 6.2.1 Expo にログイン

```bash
eas login
```

メールアドレスとパスワードを入力

#### 6.2.2 Expo プロジェクトを初期化

```bash
cd ~/SalonTalk-AI/apps/mobile

# EAS プロジェクトを初期化
eas init
```

プロジェクト名を聞かれたら `salontalk-ai` と入力

#### 6.2.3 app.json を更新

`apps/mobile/app.json` を開いて、`projectId` を更新：

```bash
# エディタで開く（VS Code の場合）
code apps/mobile/app.json
```

`extra.eas.projectId` を実際の値に更新：

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-actual-project-id"
      }
    }
  }
}
```

> `projectId` は `eas init` 実行時に表示されます。
> または https://expo.dev のプロジェクトページで確認できます。

### 6.3 EAS Build の設定

#### 6.3.1 eas.json を確認

`apps/mobile/eas.json` が存在しない場合、作成：

```bash
cd ~/SalonTalk-AI/apps/mobile
eas build:configure
```

以下の内容で `eas.json` が作成されます：

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

### 6.4 iOS アプリのビルド

#### 6.4.1 開発用ビルド（テスト用）

```bash
cd ~/SalonTalk-AI/apps/mobile

# 開発用ビルド
eas build --platform ios --profile development
```

以下の質問に答えます：
- **Would you like to log in to your Apple Developer account?** → `Y`
- Apple ID とパスワードを入力
- **Select a team** → あなたの Developer アカウントを選択
- **Bundle Identifier** → `com.revol.salontalk`（デフォルトのまま Enter）

ビルドには 10〜20 分かかります。

#### 6.4.2 本番用ビルド

```bash
eas build --platform ios --profile production
```

### 6.5 TestFlight への配信

#### 6.5.1 アプリのサブミット

```bash
eas submit --platform ios
```

以下の質問に答えます：
- **Which build would you like to submit?** → 最新のビルドを選択
- App Store Connect の認証情報を入力

#### 6.5.2 TestFlight でテスター招待

1. https://appstoreconnect.apple.com にログイン
2. 「My Apps」→「SalonTalk AI」を選択
3. 「TestFlight」タブをクリック
4. 「Internal Testing」または「External Testing」でテスターを追加

### 6.6 App Store への公開（本番リリース）

1. App Store Connect で「App Store」タブを選択
2. 必要なメタデータ（スクリーンショット、説明文など）を入力
3. 「Submit for Review」をクリック
4. Apple の審査（通常 24〜48 時間）を待つ

---

## 7. GitHub Actions CI/CD の設定

### 7.1 GitHub Secrets の設定

GitHub リポジトリで自動デプロイを設定します。

1. GitHub でリポジトリページを開く
2. 「Settings」タブをクリック
3. 左メニューの「Secrets and variables」→「Actions」
4. 「New repository secret」をクリックして以下を追加：

| Name | Value | 説明 |
|------|-------|------|
| `SUPABASE_ACCESS_TOKEN` | Supabase アクセストークン | [取得方法](#611-supabase-アクセストークンの取得) |
| `SUPABASE_PROJECT_REF` | `abc123xyz` | プロジェクト Reference ID |
| `SUPABASE_DB_PASSWORD` | DB パスワード | プロジェクト作成時にメモしたもの |
| `VERCEL_ORG_ID` | Vercel 組織 ID | [取得方法](#612-vercel-idの取得) |
| `VERCEL_PROJECT_ID` | Vercel プロジェクト ID | [取得方法](#612-vercel-idの取得) |
| `VERCEL_TOKEN` | Vercel トークン | [取得方法](#613-vercel-トークンの取得) |
| `EXPO_TOKEN` | Expo トークン | [取得方法](#614-expo-トークンの取得) |
| `TURBO_TOKEN` | Turborepo トークン | [取得方法](#615-turborepo-トークンの取得)（オプション） |

#### 7.1.1 Supabase アクセストークンの取得

1. https://supabase.com/dashboard/account/tokens にアクセス
2. 「Generate new token」をクリック
3. 名前を入力（例：`github-actions`）
4. 「Generate token」をクリック
5. トークンをコピー

#### 7.1.2 Vercel ID の取得

```bash
cd ~/SalonTalk-AI/apps/web
vercel link
```

`.vercel/project.json` が作成されます。中身を確認：

```bash
cat .vercel/project.json
```

以下のような内容が表示されます：
```json
{
  "orgId": "team_xxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxx"
}
```

- `orgId` → `VERCEL_ORG_ID`
- `projectId` → `VERCEL_PROJECT_ID`

#### 7.1.3 Vercel トークンの取得

1. https://vercel.com/account/tokens にアクセス
2. 「Create」をクリック
3. 名前を入力（例：`github-actions`）
4. 「Scope」は「Full Account」を選択
5. 「Create Token」をクリック
6. トークンをコピー

#### 7.1.4 Expo トークンの取得

1. https://expo.dev/settings/access-tokens にアクセス
2. 「Create Token」をクリック
3. 名前を入力（例：`github-actions`）
4. 「Create Token」をクリック
5. トークンをコピー

#### 7.1.5 Turborepo トークンの取得（オプション）

ビルドキャッシュを高速化したい場合：

1. https://vercel.com にログイン
2. チーム設定→「Artifacts」
3. 「Enable Remote Caching」
4. トークンを生成

### 7.2 GitHub Variables の設定

1. 「Settings」→「Secrets and variables」→「Actions」
2. 「Variables」タブをクリック
3. 「New repository variable」で以下を追加：

| Name | Value |
|------|-------|
| `TURBO_TEAM` | あなたの Vercel チーム名 |

### 7.3 CI/CD の動作確認

設定が完了したら、`main` ブランチに変更をプッシュすると自動的に：

1. **CI パイプライン** (`ci.yml`)
   - コードの Lint チェック
   - 型チェック
   - テスト実行
   - ビルド確認

2. **Web デプロイ** (`deploy-web.yml`)
   - `apps/web/` の変更時に Vercel へ自動デプロイ

3. **Mobile ビルド** (`deploy-mobile.yml`)
   - `apps/mobile/` の変更時に EAS ビルド開始

4. **Supabase デプロイ** (`deploy-supabase.yml`)
   - `supabase/` の変更時に Edge Functions をデプロイ

---

## 8. 本番環境の確認

### 8.1 チェックリスト

デプロイ完了後、以下を確認してください：

#### Supabase

- [ ] データベーステーブルが作成されている
  - Supabase ダッシュボード→「Table Editor」で確認
- [ ] Edge Functions がデプロイされている
  - 「Edge Functions」で全ての関数が表示される
- [ ] 認証設定が正しい
  - 「Authentication」→「URL Configuration」を確認

#### pyannote サーバー

- [ ] ヘルスチェックが通る
  ```bash
  curl http://YOUR_PYANNOTE_URL:8000/health
  ```
- [ ] Supabase の環境変数に URL が設定されている

#### Vercel (Web)

- [ ] サイトにアクセスできる
  - https://your-project.vercel.app にアクセス
- [ ] ログイン画面が表示される
- [ ] Supabase との接続が正常
  - ログインを試す

#### Expo (Mobile)

- [ ] ビルドが成功している
  - https://expo.dev でビルド状況を確認
- [ ] TestFlight でインストールできる（iOS）

### 8.2 初期データの投入

本番環境でテスト用のデータを作成：

1. Web ダッシュボードにアクセス
2. 「サインアップ」で管理者アカウントを作成
3. 店舗情報を入力
4. スタッフを追加

---

## 9. トラブルシューティング

### 9.1 よくあるエラーと解決方法

#### Supabase 関連

**エラー**: `supabase db push` で権限エラー
```
Error: permission denied for schema public
```

**解決方法**:
1. Supabase ダッシュボード→「SQL Editor」
2. 以下を実行：
```sql
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
```

---

**エラー**: Edge Function のデプロイ失敗
```
Error: Function deployment failed
```

**解決方法**:
1. 個別にデプロイを試す：
   ```bash
   supabase functions deploy function-name --debug
   ```
2. エラーログを確認して原因を特定

---

#### Vercel 関連

**エラー**: ビルド失敗「Cannot find module '@salontalk/shared'」

**解決方法**:
1. Vercel ダッシュボード→プロジェクト設定
2. 「Root Directory」が `apps/web` になっているか確認
3. ビルドコマンドを以下に変更：
   ```
   cd ../.. && pnpm install && pnpm build --filter=@salontalk/web
   ```

---

**エラー**: 環境変数が読み込まれない

**解決方法**:
1. 変数名が `NEXT_PUBLIC_` で始まっているか確認
2. Vercel ダッシュボードで「Redeploy」を実行

---

#### Expo 関連

**エラー**: EAS ビルド失敗「Apple Developer account not found」

**解決方法**:
1. Apple Developer Program に登録済みか確認
2. 以下でアカウントを再認証：
   ```bash
   eas credentials
   ```

---

**エラー**: 「Bundle Identifier is already in use」

**解決方法**:
1. `app.json` の `bundleIdentifier` を変更
2. 例：`com.revol.salontalk` → `com.yourcompany.salontalk`

---

#### pyannote 関連

**エラー**: GPU が認識されない
```
CUDA not available
```

**解決方法**:
1. VAST.ai/RunPod で GPU 付きインスタンスを選択しているか確認
2. PyTorch を GPU 版で再インストール：
   ```bash
   pip uninstall torch torchaudio
   pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
   ```

---

**エラー**: モデルダウンロード失敗
```
401 Unauthorized
```

**解決方法**:
1. Hugging Face トークンが正しいか確認
2. pyannote モデルの利用規約に同意しているか確認：
   - https://huggingface.co/pyannote/speaker-diarization-3.1

---

### 9.2 ログの確認方法

#### Supabase Edge Functions

1. ダッシュボード→「Edge Functions」
2. 関数を選択
3. 「Logs」タブでリアルタイムログを確認

#### Vercel

1. ダッシュボード→プロジェクト
2. 「Deployments」でデプロイを選択
3. 「Functions」タブでサーバーログを確認

#### pyannote サーバー

SSH 接続して：
```bash
# ログをリアルタイムで確認
screen -r pyannote
```

または：
```bash
# プロセスログを確認
journalctl -u pyannote -f
```

---

### 9.3 サポート

問題が解決しない場合：

1. **GitHub Issues**: https://github.com/DaisukeHori/SalonTalk-AI/issues
2. **Supabase Discord**: https://discord.supabase.com
3. **Expo Forums**: https://forums.expo.dev

---

## 10. 声紋識別機能

声紋識別機能を使用すると、顧客の声を識別して再来店時に自動で顧客情報を表示できます。

### 10.1 機能概要

| 機能 | 説明 |
|------|------|
| 声紋埋め込み抽出 | 音声から512次元の声紋ベクトルを抽出 |
| 顧客マッチング | 声紋ベクトルで既存顧客を検索 |
| 新規顧客登録 | マッチしない場合、新規顧客として自動登録 |
| 顧客名抽出 | 会話から顧客名をAIで自動抽出 |

### 10.2 仕組み

```
[音声録音] → [pyannote: 声紋抽出] → [pgvector: 類似検索]
                                           ↓
                                    [マッチあり] → 顧客情報表示 & 声紋更新
                                           ↓
                                    [マッチなし] → 新規顧客作成
                                           ↓
                                    [Claude: 名前抽出] → 顧客名更新
```

### 10.3 API エンドポイント

#### 10.3.1 声紋埋め込み抽出 (pyannote サーバー)

```bash
# 顧客の声紋を抽出
curl -X POST https://your-pyannote-server/api/v1/extract-embedding \
  -F "file=@audio.wav" \
  -F "speaker_label=customer"
```

**レスポンス例:**
```json
{
  "embedding": [0.123, -0.456, ...],  // 512次元ベクトル
  "duration_seconds": 45.2,
  "confidence": 0.85,
  "processing_time_ms": 1250
}
```

#### 10.3.2 顧客マッチング (Edge Function)

```bash
# 声紋で顧客を検索
curl -X POST https://your-project.supabase.co/functions/v1/match-customer \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "session-uuid",
    "embedding": [0.123, -0.456, ...],
    "threshold": 0.65,
    "create_if_not_found": true
  }'
```

**レスポンス例:**
```json
{
  "data": {
    "customer_id": "customer-uuid",
    "customer_name": "山田太郎",
    "confidence": "high",
    "is_new_customer": false,
    "match": {
      "similarity": 0.92,
      "total_visits": 5,
      "last_visit_at": "2025-11-15T10:30:00Z"
    }
  }
}
```

#### 10.3.3 顧客名抽出 (Edge Function)

```bash
# 会話から顧客名を抽出
curl -X POST https://your-project.supabase.co/functions/v1/extract-customer-name \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "session-uuid",
    "customer_id": "customer-uuid"
  }'
```

**レスポンス例:**
```json
{
  "data": {
    "name": "山田太郎",
    "confidence": "high",
    "context": "美容師: 山田さん、今日はカットとカラーですね。",
    "name_updated": true
  }
}
```

### 10.4 信頼度レベル

| レベル | 類似度 | 説明 |
|--------|--------|------|
| `high` | 0.85以上 | 高い確率で同一人物 |
| `medium` | 0.75〜0.85 | 同一人物の可能性が高い |
| `low` | 0.65〜0.75 | 同一人物の可能性あり |
| `none` | 0.65未満 | マッチなし（新規顧客） |

### 10.5 データベース設計

#### customers テーブル

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id),
  name VARCHAR(100),                    -- 顧客名（AI抽出）
  voice_embedding VECTOR(512),          -- 声紋ベクトル
  embedding_updated_at TIMESTAMPTZ,     -- 声紋更新日時
  total_visits INTEGER DEFAULT 1,       -- 来店回数
  first_visit_at TIMESTAMPTZ,           -- 初回来店日
  last_visit_at TIMESTAMPTZ,            -- 最終来店日
  metadata JSONB DEFAULT '{}'::jsonb,   -- 追加情報
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### sessions テーブル（追加カラム）

```sql
ALTER TABLE sessions
  ADD COLUMN customer_id UUID REFERENCES customers(id);
```

### 10.6 声紋更新ロジック

再来店時の声紋は加重平均で更新されます：

```
新しい声紋 = (1 - w) * 既存声紋 + w * 今回の声紋
```

- `w = min(1 / (来店回数 + 1), 0.3)`
- 来店回数が増えるほど、既存の声紋が優先される
- 最大でも30%の重みで新しい声紋が反映される

### 10.7 Edge Functions のデプロイ

新しく追加された Edge Functions をデプロイしてください：

```bash
# Supabase プロジェクトにログイン
supabase login

# Edge Functions をデプロイ
supabase functions deploy match-customer --project-ref YOUR_PROJECT_REF
supabase functions deploy extract-customer-name --project-ref YOUR_PROJECT_REF
```

### 10.8 データベースマイグレーション

声紋識別機能用のテーブルを作成します：

```bash
# マイグレーションを実行
supabase db push --project-ref YOUR_PROJECT_REF
```

マイグレーションファイル: `supabase/migrations/20251206184527_add_customers_voice_print.sql`

### 10.9 セキュリティ

- 声紋データは店舗ごとに分離（RLS ポリシー適用）
- 顧客の削除権限は owner/manager のみ
- 声紋データは暗号化されて保存

---

## 付録

### A. 環境変数一覧

| 変数名 | 設定場所 | 用途 |
|--------|---------|------|
| `SUPABASE_URL` | Supabase Edge Functions, Vercel, Expo | Supabase プロジェクト URL |
| `SUPABASE_ANON_KEY` | Supabase Edge Functions, Vercel, Expo | 公開 API キー |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Functions, pyannote | サービスロールキー |
| `ANTHROPIC_API_KEY` | Supabase Edge Functions | Claude API |
| `OPENAI_API_KEY` | Supabase Edge Functions | 埋め込み生成 |
| `PYANNOTE_SERVER_URL` | Supabase Edge Functions | pyannote サーバー URL |
| `PYANNOTE_API_KEY` | Supabase Edge Functions, pyannote | 認証用 |
| `PYANNOTE_CALLBACK_SECRET` | Supabase Edge Functions, pyannote | コールバック署名 |
| `HUGGINGFACE_TOKEN` | pyannote | モデルダウンロード |

### B. 推奨スペック

| コンポーネント | CPU | メモリ | GPU | ストレージ |
|---------------|-----|--------|-----|-----------|
| Vercel (Web) | - | - | - | - |
| Supabase | - | - | - | - |
| pyannote | 4 コア以上 | 16GB 以上 | RTX 3090 以上 | 50GB 以上 |

### C. 料金目安（月額）

| サービス | プラン | 料金 |
|---------|--------|------|
| Supabase | Free | $0 |
| Supabase | Pro | $25〜 |
| Vercel | Hobby | $0 |
| Vercel | Pro | $20〜 |
| Expo | Free | $0 |
| Expo | Production | $99〜 |
| VAST.ai | 従量課金 | $50〜200（使用量による） |
| Anthropic | 従量課金 | $10〜100（使用量による） |
| OpenAI | 従量課金 | $5〜50（使用量による） |
| Apple Developer | 年額 | $99 |

---

**© 2025 Revol Corporation. All Rights Reserved.**
