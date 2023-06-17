#!/bin/bash

# ==================================
# リストアスクリプト・マイグレーションスクリプト。
# 途中でdockerコンテナの再起動も行う。
# ==================================

(cd ../app && docker compose down)

# リストア・マイグレーション開始
echo "MySQLのリストアを開始します。"

sudo rm -rf ../volume/mysql
(cd ../volume && cp ../.da/backup_mysql.zip . && unzip backup_mysql.zip && rm -f backup_mysql.zip)

(cd ../app && bash restart_container.sh)
if [ $? -ne 0 ]; then
    echo "マイグレーションを中断します。"
    exit 1
fi

while :
do
    docker exec -it mysql bash -c "echo -n 'select 1;' | mysql app" &> /dev/null && break
    echo "mysqlコンテナの起動を待機しています..."
    sleep 1
done
if [ $? -ne 0 ]; then
    echo "リストアに失敗しました。"
    exit 1
else
    echo "リストアに成功しました。"
fi

next="0"
migrationDir="../app/mysql/mysql_migration"


echo "MySQLのマイグレーションを開始します。"
while :
do
    fileName=$(cd $migrationDir && ls ${next}_*.sql 2>/dev/null)
    if [ ! $fileName ]; then
        echo "マイグレーションに成功しました。"
        break
    fi

    echo "${fileName}を適用します..."
    docker exec mysql bash -c "mysql app < /etc/mysql/mysql_migration/${fileName}"
    next=$(($next + 1))
done

if [ $? -ne 0 ]; then
    echo "リストアとマイグレーションに失敗しました。"
    exit 1
fi
