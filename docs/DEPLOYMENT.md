# SalonTalk AI デプロイガイド

> **このドキュメントについて**
>
> 初心者でも迷わないよう、一挙手一投足を全てステップバイステップで説明しています。
> 上から順番に進めてください。スキップすると後でエラーになる可能性があります。

---

## 目次

1. [事前準備](#1-事前準備)
2. [Supabase のセットアップ](#2-supabase-のセットアップ)
3. [pyannote 話者分離サーバーのデプロイ](#3-pyannote-話者分離サーバーのデプロイ)
4. [Next.js Web ダッシュボードのデプロイ（Vercel）](#4-nextjs-web-ダッシュボードのデプロイvercel)
5. [React Native iPad アプリのデプロイ（Expo EAS）](#5-react-native-ipad-アプリのデプロイexpo-eas)
6. [GitHub Actions CI/CD の設定](#6-github-actions-cicd-の設定)
7. [本番環境の確認](#7-本番環境の確認)
8. [トラブルシューティング](#8-トラブルシューティング)

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

## 2. Supabase のセットアップ

### 2.1 新規プロジェクトの作成

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

### 2.2 プロジェクト情報の取得

プロジェクトが作成されたら、以下の情報を取得します。

#### 2.2.1 Project URL と API Keys

1. 左メニューの「Project Settings」（歯車アイコン）をクリック
2. 「API」をクリック
3. 以下をメモ帳にコピー：

| 項目 | 説明 | 例 |
|------|------|-----|
| **Project URL** | `SUPABASE_URL` として使用 | `https://abc123xyz.supabase.co` |
| **anon public** | `SUPABASE_ANON_KEY` として使用 | `eyJhbGciOiJIUzI1NiIs...` |
| **service_role secret** | `SUPABASE_SERVICE_ROLE_KEY` として使用 | `eyJhbGciOiJIUzI1NiIs...` |

> **警告**: `service_role` キーは絶対に公開しないでください！

#### 2.2.2 Project Reference ID

1. 「Project Settings」→「General」
2. 「Reference ID」をメモ（例：`abc123xyz`）

### 2.3 データベースマイグレーションの実行

#### 2.3.1 Supabase CLI でログイン

```bash
supabase login
```

ブラウザが開くので「Authorize」をクリック

#### 2.3.2 プロジェクトをリンク

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

#### 2.3.3 マイグレーションを実行

```bash
supabase db push
```

以下のような出力が表示されれば成功：
```
Applying migration 00000000000000_initial_schema.sql...
Applying migration 20251205000001_add_setup_wizard.sql...
Finished supabase db push.
```

### 2.4 Edge Functions のデプロイ

#### 2.4.1 環境変数の設定

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

> **PYANNOTE_SERVER_URL は後で設定します**（セクション3で pyannote サーバーをデプロイ後）

#### 2.4.2 Edge Functions をデプロイ

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

### 2.5 認証設定

#### 2.5.1 メール認証の設定

1. Supabase ダッシュボードで「Authentication」→「Providers」
2. 「Email」が有効になっていることを確認
3. 「Confirm email」を有効にする（メール確認を必須にする場合）

#### 2.5.2 リダイレクト URL の設定

1. 「Authentication」→「URL Configuration」
2. 「Site URL」に本番の URL を設定（後で設定）：
   - 例：`https://salontalk-ai.vercel.app`
3. 「Redirect URLs」に以下を追加：
   - `http://localhost:3000/**`（開発用）
   - `https://salontalk-ai.vercel.app/**`（本番用、後で設定）
   - `exp://localhost:8081/**`（Expo 開発用）

---

## 3. pyannote 話者分離サーバーのデプロイ

pyannote は GPU が必要なため、クラウド GPU サービス（VAST.ai または RunPod）を使用します。

### 3.1 VAST.ai を使用する場合

#### 3.1.1 VAST.ai アカウント作成と入金

1. https://vast.ai にアクセス
2. 「Sign Up」でアカウント作成
3. 「Billing」→「Add Credit」で最低 $10 入金（クレジットカード）

#### 3.1.2 インスタンスの検索

1. 「Search」タブをクリック
2. 以下の条件でフィルター：
   - **GPU**: RTX 3090 以上推奨（VRAM 24GB 以上）
   - **Disk Space**: 50GB 以上
   - **Internet Speed**: 100 Mbps 以上
3. 「$/hr」列で価格を確認（$0.3〜$0.8/時間が目安）
4. 適切なインスタンスの「RENT」をクリック

#### 3.1.3 Docker イメージの設定

1. 「Edit Image & Config」をクリック
2. 以下を設定：
   - **Docker Image**: `python:3.11-slim`
   - **Docker Options**: `-p 8000:8000`
   - **Disk Space to Allocate**: `50 GB`
   - **On-start Script**: 空のまま
3. 「RENT」をクリック

#### 3.1.4 インスタンスに接続

1. 「Instances」タブでインスタンスが「Running」になるまで待つ
2. インスタンスの「Connect」をクリック
3. SSH コマンドをコピー（例：`ssh -p 12345 root@xxx.xxx.xxx.xxx`）

ローカルターミナルで：
```bash
# SSH 接続（表示されたコマンドを使用）
ssh -p 12345 root@xxx.xxx.xxx.xxx
```

パスワードを聞かれたら、VAST.ai の画面に表示されているパスワードを入力

#### 3.1.5 pyannote サーバーをセットアップ

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

#### 3.1.6 バックグラウンド実行の設定

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

#### 3.1.7 サーバー URL の確認

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

### 3.2 RunPod を使用する場合（代替）

#### 3.2.1 RunPod アカウント作成

1. https://runpod.io にアクセス
2. 「Sign Up」でアカウント作成
3. 「Billing」→「Add Credit」で最低 $10 入金

#### 3.2.2 Pod の作成

1. 「Pods」→「Deploy」をクリック
2. GPU を選択（RTX 3090 以上推奨）
3. 「Container Image」に `python:3.11-slim` を入力
4. 「Expose HTTP Ports」に `8000` を入力
5. 「Deploy On-Demand」をクリック

#### 3.2.3 セットアップ

1. Pod が「Running」になったら「Connect」をクリック
2. 「Start Web Terminal」をクリック
3. VAST.ai と同じセットアップコマンドを実行

---

### 3.3 Supabase に pyannote URL を設定

pyannote サーバーが起動したら、Supabase の Edge Functions 環境変数を更新：

1. Supabase ダッシュボード→「Edge Functions」→「Manage secrets」
2. `PYANNOTE_SERVER_URL` を編集
3. 実際の URL を入力（例：`http://123.45.67.89:8000`）
4. 「Save」をクリック

---

## 4. Next.js Web ダッシュボードのデプロイ（Vercel）

### 4.1 Vercel にログイン

```bash
vercel login
```

ブラウザが開くので：
1. 「Continue with GitHub」をクリック
2. 認証を許可

### 4.2 プロジェクトをインポート

#### 4.2.1 GitHub リポジトリを Vercel に接続

1. https://vercel.com/dashboard にアクセス
2. 「Add New...」→「Project」をクリック
3. 「Import Git Repository」で `DaisukeHori/SalonTalk-AI` を選択
4. 「Import」をクリック

#### 4.2.2 プロジェクト設定

以下を設定：

| 設定項目 | 値 |
|---------|-----|
| **Project Name** | `salontalk-ai`（お好みで変更可） |
| **Framework Preset** | `Next.js`（自動検出） |
| **Root Directory** | `apps/web` をクリックして選択 |
| **Build Command** | `pnpm build`（デフォルトのまま） |
| **Output Directory** | `.next`（デフォルトのまま） |
| **Install Command** | `pnpm install`（デフォルトのまま） |

#### 4.2.3 環境変数の設定

「Environment Variables」セクションで以下を追加：

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://abc123xyz.supabase.co`（あなたの Supabase URL） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...`（あなたの anon key） |

> **注意**:
> - `NEXT_PUBLIC_` プレフィックスはクライアント側で使用するために必要
> - `service_role` キーはフロントエンドには設定しない（セキュリティ上の理由）

#### 4.2.4 デプロイを実行

1. 「Deploy」をクリック
2. ビルドが完了するまで待つ（約2〜3分）
3. 「Congratulations!」と表示されたらデプロイ完了

#### 4.2.5 デプロイ URL を確認

デプロイ完了後、URL が表示されます：
- 例：`https://salontalk-ai.vercel.app`

この URL をメモしてください。

### 4.3 Supabase のリダイレクト URL を更新

1. Supabase ダッシュボード→「Authentication」→「URL Configuration」
2. 「Site URL」を Vercel の URL に変更：
   - `https://salontalk-ai.vercel.app`
3. 「Redirect URLs」に追加：
   - `https://salontalk-ai.vercel.app/**`
4. 「Save」をクリック

### 4.4 カスタムドメインの設定（オプション）

独自ドメインを使用する場合：

1. Vercel ダッシュボードでプロジェクトを選択
2. 「Settings」→「Domains」
3. 「Add」をクリックしてドメインを入力
4. DNS 設定の指示に従う

---

## 5. React Native iPad アプリのデプロイ（Expo EAS）

### 5.1 Apple Developer Program への登録

**重要**: iOS アプリを配信するには Apple Developer Program（年間 $99）への登録が必要です。

1. https://developer.apple.com/programs/ にアクセス
2. 「Enroll」をクリック
3. Apple ID でログイン（なければ作成）
4. 必要情報を入力
5. 年会費 $99 を支払い
6. 審査承認まで 24〜48時間待つ

### 5.2 Expo プロジェクト ID の設定

#### 5.2.1 Expo にログイン

```bash
eas login
```

メールアドレスとパスワードを入力

#### 5.2.2 Expo プロジェクトを初期化

```bash
cd ~/SalonTalk-AI/apps/mobile

# EAS プロジェクトを初期化
eas init
```

プロジェクト名を聞かれたら `salontalk-ai` と入力

#### 5.2.3 app.json を更新

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

### 5.3 EAS Build の設定

#### 5.3.1 eas.json を確認

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

### 5.4 iOS アプリのビルド

#### 5.4.1 開発用ビルド（テスト用）

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

#### 5.4.2 本番用ビルド

```bash
eas build --platform ios --profile production
```

### 5.5 TestFlight への配信

#### 5.5.1 アプリのサブミット

```bash
eas submit --platform ios
```

以下の質問に答えます：
- **Which build would you like to submit?** → 最新のビルドを選択
- App Store Connect の認証情報を入力

#### 5.5.2 TestFlight でテスター招待

1. https://appstoreconnect.apple.com にログイン
2. 「My Apps」→「SalonTalk AI」を選択
3. 「TestFlight」タブをクリック
4. 「Internal Testing」または「External Testing」でテスターを追加

### 5.6 App Store への公開（本番リリース）

1. App Store Connect で「App Store」タブを選択
2. 必要なメタデータ（スクリーンショット、説明文など）を入力
3. 「Submit for Review」をクリック
4. Apple の審査（通常 24〜48 時間）を待つ

---

## 6. GitHub Actions CI/CD の設定

### 6.1 GitHub Secrets の設定

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

#### 6.1.1 Supabase アクセストークンの取得

1. https://supabase.com/dashboard/account/tokens にアクセス
2. 「Generate new token」をクリック
3. 名前を入力（例：`github-actions`）
4. 「Generate token」をクリック
5. トークンをコピー

#### 6.1.2 Vercel ID の取得

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

#### 6.1.3 Vercel トークンの取得

1. https://vercel.com/account/tokens にアクセス
2. 「Create」をクリック
3. 名前を入力（例：`github-actions`）
4. 「Scope」は「Full Account」を選択
5. 「Create Token」をクリック
6. トークンをコピー

#### 6.1.4 Expo トークンの取得

1. https://expo.dev/settings/access-tokens にアクセス
2. 「Create Token」をクリック
3. 名前を入力（例：`github-actions`）
4. 「Create Token」をクリック
5. トークンをコピー

#### 6.1.5 Turborepo トークンの取得（オプション）

ビルドキャッシュを高速化したい場合：

1. https://vercel.com にログイン
2. チーム設定→「Artifacts」
3. 「Enable Remote Caching」
4. トークンを生成

### 6.2 GitHub Variables の設定

1. 「Settings」→「Secrets and variables」→「Actions」
2. 「Variables」タブをクリック
3. 「New repository variable」で以下を追加：

| Name | Value |
|------|-------|
| `TURBO_TEAM` | あなたの Vercel チーム名 |

### 6.3 CI/CD の動作確認

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

## 7. 本番環境の確認

### 7.1 チェックリスト

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

### 7.2 初期データの投入

本番環境でテスト用のデータを作成：

1. Web ダッシュボードにアクセス
2. 「サインアップ」で管理者アカウントを作成
3. 店舗情報を入力
4. スタッフを追加

---

## 8. トラブルシューティング

### 8.1 よくあるエラーと解決方法

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

### 8.2 ログの確認方法

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

### 8.3 サポート

問題が解決しない場合：

1. **GitHub Issues**: https://github.com/DaisukeHori/SalonTalk-AI/issues
2. **Supabase Discord**: https://discord.supabase.com
3. **Expo Forums**: https://forums.expo.dev

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
