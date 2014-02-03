TSUBAME 2.5 に MPI ジョブを投入するための小便利スクリプト

- ジョブの内容は単純な JavaScript で記述
- mpirun のパラメタは PBS の設定より自動的に生成
- 各種ログの生成

-----

# Requirements

Node.js と NPM



# インストール方法

    npm -g install t2pbs

# 使い方

以下のジョブ記述ファイルを作成し，chmod +a したら，これを実行するだけ．

    #!/usr/bin/env node
    
    require('t2pbs').run({
        Command: '/work0/t2g-graphcrest/users/wakita/x10/template/bin/hello',
        PBS: {
          Select: { Chunks: 4, ncpus: 2, mem: '2gb' }
        }
    });

Command にMPIコマンドを指定し，PBS.Selectの内容で計算資源を確保する．Selectの内容については，TSUBAME 2.5 利用の手引きを参照のこと．

# 実行例

前述のジョブ記述ファイルの場合，Hello-20140203-1814のような形式のジョブIDが割り当てられる．これは，コマンドに日時を追加した形式となっている．

T2PBSシステムはこの記述にしたがいt2subコマンドとmpirunコマンドを実行し，並列ジョブを投入する．

- <ジョブID>.conf  ジョブの実行形態，t2subやmpirunの引数，環境変数などを JSON 形式で保存したもの．
- <ジョブID>.err:  ジョブの標準エラー出力の内容
- <ジョブID>.out:  ジョブの標準出力の内容
