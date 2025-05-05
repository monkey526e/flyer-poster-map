import gspread
import json
from oauth2client.service_account import ServiceAccountCredentials
import requests
import base64
from datetime import datetime
import os
from dotenv import load_dotenv

def fetch_sheet_data():
    # 👇 ① サービスアカウントの認証情報ファイル（JSON形式）のファイル名
    SERVICE_ACCOUNT_FILE = 'credentials.json'

    # 👇 ② 認証スコープ（このままでOK）
    scope = [
        'https://spreadsheets.google.com/feeds',
        'https://www.googleapis.com/auth/drive'
    ]

    creds = ServiceAccountCredentials.from_json_keyfile_name(SERVICE_ACCOUNT_FILE, scope)
    client = gspread.authorize(creds)

    # 👇 ③ 対象のスプレッドシート名
    spreadsheet_name = 'form_data'

    # 👇 ④ 対象のシート名（シート1なら sheet1 でOK）
    sheet = client.open(spreadsheet_name).worksheet("中野区_奥本")

    # 👇 ⑤ スプレッドシートの全データを取得
    data = sheet.get_all_records()
    return data

def save_json(data):
    # 👇 ⑥ 出力する JSON ファイル名（ローカル保存）
    filename = 'data.json'
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    return filename

def upload_to_github(filename):
    # 👇 ⑦ GitHub のユーザー名とリポジトリ名
    repo = 'https://github.com/monkey526e/flyer-map'

    # 👇 ⑧ GitHub リポジトリ内で保存するパス
    path = 'public/data/all_data.json'  # 例: 'data/data.json'

    # 👇 ⑨ Personal Access Token（GitHubで作成したトークン）
    load_dotenv()  # .env ファイルを読み込む
    # トークンを環境変数から取得
    token = os.getenv("GITHUB_TOKEN")

    # 👇 ⑩ コミットメッセージ（自動生成でもOK）
    message = f'Auto update at {datetime.utcnow().isoformat()}'

    # GitHub API エンドポイント
    url = f'https://api.github.com/repos/{repo}/contents/{path}'
    headers = {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json',
    }

    # 👇 ⑪ ファイルを base64 にエンコード
    with open(filename, 'rb') as f:
        content = base64.b64encode(f.read()).decode()

    # 👇 ⑫ すでにファイルが存在するか確認（あれば更新、なければ新規作成）
    r = requests.get(url, headers=headers)
    sha = r.json().get('sha') if r.status_code == 200 else None

    data = {
        'message': message,
        'content': content,
        'branch': 'main',  # 必要なら 'main' を他のブランチに変更
    }
    if sha:
        data['sha'] = sha

    response = requests.put(url, headers=headers, json=data)
    print(response.status_code, response.json())

def main():
    data = fetch_sheet_data()
    json_file = save_json(data)
    upload_to_github(json_file)

if __name__ == '__main__':
    main()
