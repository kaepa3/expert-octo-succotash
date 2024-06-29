# syntax=docker/dockerfile:1

# 実行ファイル作成用のビルドステージ
FROM denoland/deno:debian AS builder

# SQLite 接続に使用するためインストール
RUN apt-get update \
  && apt-get install -y curl unzip

WORKDIR /app

COPY *.ts deno.* makefile ./
COPY .env ./

RUN deno cache --lock-write main.ts
RUN PUPPETEER_PRODUCT=chrome deno compile -A  -o ./vpoint main.ts

# 最終的な image のビルドステージ
FROM debian

WORKDIR /app

# ビルド用の image から実行ファイルをコピー
COPY --from=builder /app/vpoint .
COPY .env ./

CMD [ "/app/vpoint" ]
