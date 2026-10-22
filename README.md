# AI 4コマ漫画工房

5つの質問で物語を組み立て、制作スタジオで画像・セリフを編集して4コマ漫画のPNGを書き出す無料Webアプリです。

## ページ

- 質問ウィザード: https://selfwilled6412-cyber.github.io/ai-4koma-manga-kobo/
- 4コマ制作スタジオ: https://selfwilled6412-cyber.github.io/ai-4koma-manga-kobo/studio.html

## 使い方

1. 5つの質問に答えて「この物語を4コマに仕上げる！」を押す。または制作スタジオへ直接進む。
2. 作品タイトル、主人公、各コマの場面説明とセリフを編集する。
3. 必要ならAI画像生成の指示文をコピーして外部サービスでイラストを作り、1コマずつ画像を入れる。
4. 画像の拡大・位置を調整し、縦4コマ・2×2を切り替える。
5. PNG保存、A4印刷、編集用JSONの保存・読み込みを行う。

## 仕様と制限

- HTML/CSS/JavaScriptのみ。ログイン・サーバー・APIキー不要。
- AI画像をこのWebアプリから直接生成する機能は**未実装**。画像の生成は別ツールが必要。
- PNG/JPEG/WebP画像に対応。各8MB以下。
- 編集内容は端末のブラウザに自動保存。ブラウザ容量を超えると文字のみ自動保存されるため、必ずJSONを保存すること。
- JSONには画像が埋め込まれているため、ファイルサイズが大きくなることがあります。
- 画像の処理はブラウザ内で完結し、Webサーバーには送信しません。
- GitHub Pagesを使う場合は Settings > Pages の公開元を main / (root) に設定してください。

## ローカル動作

HTTPサーバーを起動: `python -m http.server 8000`

質問画面: http://localhost:8000/

制作画面: http://localhost:8000/studio.html

## ファイル

- index.html / app.js / styles.css: 質問ウィザード
- studio.html / studio.js / studio.css: 制作スタジオ
